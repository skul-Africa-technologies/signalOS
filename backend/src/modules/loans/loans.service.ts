import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DisbursementStatus, LedgerCategory } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { TrustScoreService } from '../trust-score/trust-score.service';
import { WalletService } from '../wallet/wallet.service';
import { DisburseLoanDto } from './dto/disburse-loan.dto';
import type { RiskLevel } from '../trust-score/scoring.engine';

export const LOAN_EVENTS = {
  APPROVED: 'loan.approved',
  DISBURSED: 'loan.disbursed',
} as const;

export interface EligibilityResult {
  eligible: boolean;
  eligibleAmount: number;
  riskLevel: RiskLevel;
  recommendation: string;
  trustScore: number;
  breakdown: Record<string, number>;
  reasons: string[];
}

@Injectable()
export class LoansService {
  private readonly logger = new Logger(LoansService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly trustScore: TrustScoreService,
    private readonly walletService: WalletService,
    private readonly events: EventEmitter2,
  ) {}

  async evaluate(userId: string): Promise<EligibilityResult> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const report = await this.trustScore.recalculate(userId);
    const { trustScore, riskLevel, breakdown, reasons } = report;

    const eligible = trustScore >= 40;
    const eligibleAmount = this.calcAmount(trustScore, riskLevel);
    const recommendation = this.buildRecommendation(eligible, riskLevel, eligibleAmount);

    await this.prisma.loanEligibility.upsert({
      where: { userId },
      create: { userId, eligible, eligibleAmount, riskLevel, recommendation, trustScore },
      update: { eligible, eligibleAmount, riskLevel, recommendation, trustScore, evaluatedAt: new Date() },
    });

    if (eligible) {
      this.events.emit(LOAN_EVENTS.APPROVED, { userId, eligibleAmount, trustScore, riskLevel });
    }

    return { eligible, eligibleAmount, riskLevel, recommendation, trustScore, breakdown, reasons };
  }

  async getEligibility(userId: string) {
    const record = await this.prisma.loanEligibility.findUnique({ where: { userId } });
    if (!record) return this.evaluate(userId);
    return record;
  }

  async disburse(userId: string, dto: DisburseLoanDto) {
    const eligibility = await this.getEligibility(userId);
    if (!eligibility.eligible) {
      throw new BadRequestException('User is not eligible for a loan');
    }
    if (dto.amount > eligibility.eligibleAmount) {
      throw new BadRequestException(
        `Requested amount ₦${dto.amount} exceeds eligible amount ₦${eligibility.eligibleAmount}`,
      );
    }

    // Prevent duplicate active disbursements
    const activeLoan = await this.prisma.loanDisbursement.findFirst({
      where: { userId, status: { in: [DisbursementStatus.DISBURSED, DisbursementStatus.APPROVED] } },
    });
    if (activeLoan) {
      throw new BadRequestException('User already has an active loan disbursement');
    }

    const reference = `loan_${userId}_${Date.now()}`;
    const wallet = await this.walletService.getOrCreate(userId);
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + (dto.loanTermDays ?? 30));

    const disbursement = await this.prisma.$transaction(async (tx) => {
      const w = await tx.wallet.findUnique({ where: { id: wallet.id } });

      const disbursement = await tx.loanDisbursement.create({
        data: {
          userId,
          walletId: wallet.id,
          amount: dto.amount,
          reference,
          status: DisbursementStatus.DISBURSED,
          loanTermDays: dto.loanTermDays ?? 30,
          dueDate,
          disbursedAt: new Date(),
        },
      });

      await tx.wallet.update({
        where: { id: wallet.id },
        data: {
          availableBalance: { increment: dto.amount },
          totalCredits: { increment: dto.amount },
        },
      });

      await tx.ledgerEntry.create({
        data: {
          walletId: wallet.id,
          type: 'CREDIT',
          direction: 'CREDIT',
          amount: dto.amount,
          reference: `ledger_${reference}`,
          category: LedgerCategory.LOAN_DISBURSEMENT,
          balanceBefore: w?.availableBalance ?? 0,
          balanceAfter: (w?.availableBalance ?? 0) + dto.amount,
          metadata: { disbursementId: disbursement.id, dueDate },
        },
      });

      return disbursement;
    });

    this.events.emit(LOAN_EVENTS.DISBURSED, { userId, disbursement });
    this.logger.log(`Loan disbursed: user=${userId} amount=${dto.amount} ref=${reference}`);
    return disbursement;
  }

  async getDisbursements(userId: string) {
    return this.prisma.loanDisbursement.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  private calcAmount(score: number, risk: RiskLevel): number {
    if (score < 40) return 0;
    const base = (score - 40) * 5000;
    const caps: Record<RiskLevel, number> = {
      Low: 500_000,
      Medium: 200_000,
      High: 75_000,
      'Very High': 0,
    };
    return Math.min(base, caps[risk]);
  }

  private buildRecommendation(eligible: boolean, risk: RiskLevel, amount: number): string {
    if (!eligible) return 'Build more transaction history to qualify for a loan';
    const fmt = new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 });
    const labels: Record<RiskLevel, string> = {
      Low: 'Eligible for micro expansion loan',
      Medium: 'Eligible for working capital loan',
      High: 'Eligible for starter micro-loan',
      'Very High': 'Not eligible at this time',
    };
    return `${labels[risk]} up to ${fmt.format(amount)}`;
  }
}
