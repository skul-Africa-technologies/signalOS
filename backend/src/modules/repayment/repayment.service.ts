import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DisbursementStatus, LedgerCategory, RepaymentScheduleStatus } from '../../common/prisma-enums';
import { PrismaService } from '../../prisma/prisma.service';
import { WalletService } from '../wallet/wallet.service';
import { GenerateScheduleDto, MakeRepaymentDto, RepaymentInterval } from './dto/repayment.dto';

export const REPAYMENT_EVENTS = {
  CREATED: 'loan.repayment.created',
  COMPLETED: 'loan.repayment.completed',
  OVERDUE: 'loan.repayment.overdue',
  DEFAULT_DETECTED: 'loan.default.detected',
  PENALTY_APPLIED: 'loan.penalty.applied',
} as const;

const DAILY_PENALTY_RATE = 0.001; // 0.1% per day overdue
const GRACE_PERIOD_DAYS = 3;
const DEFAULT_THRESHOLD_DAYS = 90;

@Injectable()
export class RepaymentService {
  private readonly logger = new Logger(RepaymentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly wallet: WalletService,
    private readonly events: EventEmitter2,
  ) {}

  // ─── Schedule Generation ────────────────────────────────────────────────────

  async generateSchedule(dto: GenerateScheduleDto) {
    const existing = await this.prisma.loanRepaymentSchedule.findFirst({ where: { loanId: dto.loanId } });
    if (existing) throw new BadRequestException('Repayment schedule already exists for this loan');

    const rate = (dto.annualInterestRate ?? 0) / 100 / 12;
    const installmentAmount = rate > 0
      ? (dto.principal * rate * Math.pow(1 + rate, dto.installments)) / (Math.pow(1 + rate, dto.installments) - 1)
      : dto.principal / dto.installments;

    const intervalDays = dto.interval === RepaymentInterval.WEEKLY ? 7 : 30;
    const rows: any[] = [];

    for (let i = 1; i <= dto.installments; i++) {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + intervalDays * i);

      const interestAmount = rate > 0 ? (dto.principal - (installmentAmount - dto.principal * rate) * (i - 1)) * rate : 0;
      const principalAmount = installmentAmount - interestAmount;

      rows.push({
        loanId: dto.loanId,
        installmentNumber: i,
        amountDue: Math.round(installmentAmount),
        principalAmount: Math.round(principalAmount),
        interestAmount: Math.round(interestAmount),
        dueDate,
      });
    }

    return this.prisma.loanRepaymentSchedule.createMany({ data: rows });
  }

  async getSchedule(loanId: string) {
    return this.prisma.loanRepaymentSchedule.findMany({
      where: { loanId },
      orderBy: { installmentNumber: 'asc' },
    });
  }

  // ─── Repayment Processing ───────────────────────────────────────────────────

  async processRepayment(userId: string, dto: MakeRepaymentDto) {
    const loan = await this.prisma.loanDisbursement.findFirst({
      where: { id: dto.loanId, userId, status: DisbursementStatus.DISBURSED },
    });
    if (!loan) throw new NotFoundException('Active loan not found');

    // Find the next pending/overdue schedule
    const schedule = dto.scheduleId
      ? await this.prisma.loanRepaymentSchedule.findUnique({ where: { id: dto.scheduleId } })
      : await this.prisma.loanRepaymentSchedule.findFirst({
          where: { loanId: dto.loanId, status: { in: [RepaymentScheduleStatus.PENDING, RepaymentScheduleStatus.OVERDUE, RepaymentScheduleStatus.PARTIAL] } },
          orderBy: { installmentNumber: 'asc' },
        });

    if (!schedule) throw new BadRequestException('No pending repayment schedule found');

    const reference = `repay_${dto.loanId}_${schedule.id}_${Date.now()}`;

    // Idempotency check
    const existing = await this.prisma.loanRepayment.findFirst({ where: { repaymentScheduleId: schedule.id, amountPaid: dto.amount } });
    if (existing) throw new BadRequestException('Duplicate repayment detected');

    const wallet = await this.wallet.getWallet(userId);
    const totalDue = schedule.amountDue + schedule.penaltyAmount;
    const isPaid = dto.amount >= totalDue;
    const isPartial = dto.amount > 0 && dto.amount < totalDue;

    await this.prisma.$transaction(async (tx) => {
      // Debit borrower wallet
      const w = await tx.wallet.findUnique({ where: { userId } });
      if (!w || w.availableBalance < dto.amount) throw new BadRequestException('Insufficient balance');

      await tx.wallet.update({
        where: { userId },
        data: { availableBalance: { decrement: dto.amount }, totalDebits: { increment: dto.amount } },
      });

      await tx.ledgerEntry.create({
        data: {
          walletId: w.id,
          type: 'DEBIT',
          direction: 'DEBIT',
          amount: dto.amount,
          reference: `ledger_${reference}`,
          category: LedgerCategory.INTERNAL_TRANSFER,
          balanceBefore: w.availableBalance,
          balanceAfter: w.availableBalance - dto.amount,
          metadata: JSON.stringify({ loanId: dto.loanId, scheduleId: schedule.id }),
        },
      });

      // Persist repayment record
      await tx.loanRepayment.create({
        data: {
          loanId: dto.loanId,
          repaymentScheduleId: schedule.id,
          walletId: w.id,
          amountPaid: dto.amount,
          paymentReference: reference,
          paidAt: new Date(),
        },
      });

      // Update schedule status
      await tx.loanRepaymentSchedule.update({
        where: { id: schedule.id },
        data: {
          status: isPaid ? RepaymentScheduleStatus.PAID : RepaymentScheduleStatus.PARTIAL,
          paidAt: isPaid ? new Date() : null,
          amountDue: isPartial ? totalDue - dto.amount : schedule.amountDue,
        },
      });

      // If fully paid, check if all installments done → mark loan repaid
      if (isPaid) {
        const remaining = await tx.loanRepaymentSchedule.count({
          where: { loanId: dto.loanId, status: { notIn: [RepaymentScheduleStatus.PAID] } },
        });
        if (remaining === 0) {
          await tx.loanDisbursement.update({
            where: { id: dto.loanId },
            data: { status: DisbursementStatus.REPAID, repaidAt: new Date() },
          });
        }
      }
    });

    this.events.emit(REPAYMENT_EVENTS.CREATED, { userId, loanId: dto.loanId, amount: dto.amount, scheduleId: schedule.id });
    if (isPaid) {
      this.events.emit(REPAYMENT_EVENTS.COMPLETED, { userId, loanId: dto.loanId, scheduleId: schedule.id, amount: dto.amount });
    }

    this.logger.log(`Repayment processed: user=${userId} loan=${dto.loanId} amount=${dto.amount}`);
    return { success: true, reference, isPaid, isPartial };
  }

  async getRepaymentHistory(loanId: string) {
    return this.prisma.loanRepayment.findMany({
      where: { loanId },
      orderBy: { paidAt: 'desc' },
    });
  }

  async getOutstandingBalance(loanId: string): Promise<number> {
    const schedules = await this.prisma.loanRepaymentSchedule.findMany({
      where: { loanId, status: { notIn: [RepaymentScheduleStatus.PAID] } },
    });
    return schedules.reduce((sum, s) => sum + s.amountDue + s.penaltyAmount, 0);
  }

  // ─── Overdue Detection ──────────────────────────────────────────────────────

  async detectAndMarkOverdue(): Promise<number> {
    const now = new Date();
    const graceCutoff = new Date(now.getTime() - GRACE_PERIOD_DAYS * 86400000);

    const overdue = await this.prisma.loanRepaymentSchedule.findMany({
      where: { status: RepaymentScheduleStatus.PENDING, dueDate: { lt: graceCutoff } },
    });

    for (const schedule of overdue) {
      const daysOverdue = Math.floor((now.getTime() - schedule.dueDate.getTime()) / 86400000);
      const penalty = Math.round(schedule.amountDue * DAILY_PENALTY_RATE * daysOverdue);

      await this.prisma.loanRepaymentSchedule.update({
        where: { id: schedule.id },
        data: { status: RepaymentScheduleStatus.OVERDUE, penaltyAmount: penalty },
      });

      this.events.emit(REPAYMENT_EVENTS.OVERDUE, { loanId: schedule.loanId, scheduleId: schedule.id, daysOverdue, penalty });
      if (penalty > 0) this.events.emit(REPAYMENT_EVENTS.PENALTY_APPLIED, { loanId: schedule.loanId, penalty });
    }

    this.logger.log(`Overdue scan: ${overdue.length} schedules marked overdue`);
    return overdue.length;
  }

  async detectDefaults(): Promise<number> {
    const cutoff = new Date(Date.now() - DEFAULT_THRESHOLD_DAYS * 86400000);

    const defaults = await this.prisma.loanRepaymentSchedule.findMany({
      where: { status: RepaymentScheduleStatus.OVERDUE, dueDate: { lt: cutoff } },
      distinct: ['loanId'],
    });

    for (const s of defaults) {
      await this.prisma.loanDisbursement.updateMany({
        where: { id: s.loanId, status: DisbursementStatus.DISBURSED },
        data: { status: DisbursementStatus.DEFAULTED },
      });
      this.events.emit(REPAYMENT_EVENTS.DEFAULT_DETECTED, { loanId: s.loanId });
    }

    this.logger.log(`Default scan: ${defaults.length} loans defaulted`);
    return defaults.length;
  }

  // ─── Repayment Intelligence ─────────────────────────────────────────────────

  async getRepaymentIntelligence(userId: string) {
    const loans = await this.prisma.loanDisbursement.findMany({ where: { userId } });
    const loanIds = loans.map((l) => l.id);

    const [total, paid, overdue, missed] = await Promise.all([
      this.prisma.loanRepaymentSchedule.count({ where: { loanId: { in: loanIds } } }),
      this.prisma.loanRepaymentSchedule.count({ where: { loanId: { in: loanIds }, status: RepaymentScheduleStatus.PAID } }),
      this.prisma.loanRepaymentSchedule.count({ where: { loanId: { in: loanIds }, status: RepaymentScheduleStatus.OVERDUE } }),
      this.prisma.loanRepaymentSchedule.count({ where: { loanId: { in: loanIds }, status: RepaymentScheduleStatus.MISSED } }),
    ]);

    const repaymentRate = total > 0 ? paid / total : 0;
    const delinquencyRate = total > 0 ? (overdue + missed) / total : 0;

    return {
      totalInstallments: total,
      paidInstallments: paid,
      overdueInstallments: overdue,
      missedInstallments: missed,
      repaymentRate: parseFloat(repaymentRate.toFixed(2)),
      delinquencyRate: parseFloat(delinquencyRate.toFixed(2)),
      repaymentReliability: repaymentRate >= 0.9 ? 'EXCELLENT' : repaymentRate >= 0.7 ? 'GOOD' : repaymentRate >= 0.5 ? 'FAIR' : 'POOR',
    };
  }
}
