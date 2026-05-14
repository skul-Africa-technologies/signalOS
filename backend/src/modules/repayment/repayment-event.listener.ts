import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../../prisma/prisma.service';
import { TrustScoreService } from '../trust-score/trust-score.service';
import { REPAYMENT_EVENTS } from './repayment.service';

@Injectable()
export class RepaymentEventListener {
  private readonly logger = new Logger(RepaymentEventListener.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly trustScore: TrustScoreService,
  ) {}

  @OnEvent(REPAYMENT_EVENTS.COMPLETED)
  async onRepaymentCompleted(payload: { userId: string; loanId: string; amount: number }) {
    this.logger.log(`Repayment completed: user=${payload.userId} — recalculating trust`);
    await this.trustScore.recalculate(payload.userId);

    // Replenish cooperative treasury if loan originated from group
    const loan = await this.prisma.loanDisbursement.findUnique({ where: { id: payload.loanId } });
    if (!loan) return;

    // Find group wallet linked to this loan's wallet
    const groupWallet = await this.prisma.savingsGroupWallet.findFirst({
      where: { id: loan.walletId },
    });
    if (groupWallet) {
      await this.prisma.savingsGroupWallet.update({
        where: { id: groupWallet.id },
        data: {
          availableBalance: { increment: payload.amount },
          lendingPoolBalance: { increment: payload.amount * 0.8 },
          reserveBalance: { increment: payload.amount * 0.2 },
        },
      });
      this.logger.log(`Treasury replenished: group=${groupWallet.groupId} amount=${payload.amount}`);
    }
  }

  @OnEvent(REPAYMENT_EVENTS.OVERDUE)
  async onRepaymentOverdue(payload: { loanId: string; daysOverdue: number }) {
    this.logger.warn(`Repayment overdue: loan=${payload.loanId} days=${payload.daysOverdue}`);
    const loan = await this.prisma.loanDisbursement.findUnique({ where: { id: payload.loanId } });
    if (!loan) return;
    // Degrade trust on overdue
    await this.trustScore.recalculate(loan.userId);
  }

  @OnEvent(REPAYMENT_EVENTS.DEFAULT_DETECTED)
  async onDefault(payload: { loanId: string }) {
    this.logger.error(`Loan default detected: loan=${payload.loanId}`);
    const loan = await this.prisma.loanDisbursement.findUnique({ where: { id: payload.loanId } });
    if (!loan) return;
    await this.trustScore.recalculate(loan.userId);
  }
}
