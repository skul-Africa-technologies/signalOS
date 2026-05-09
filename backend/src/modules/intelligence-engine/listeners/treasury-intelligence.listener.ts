import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../../../prisma/prisma.service';
import { TreasurySignalExtractor } from '../extractors/treasury-signal.extractor';

@Injectable()
export class TreasuryIntelligenceListener {
  private readonly logger = new Logger(TreasuryIntelligenceListener.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly extractor: TreasurySignalExtractor,
  ) {}

  @OnEvent('group.loan.disbursed', { async: true })
  async onLoanDisbursed(payload: { groupId: string; borrowerId: string; amount: number }) {
    await this.updateBorrowerTrustContext(payload.borrowerId, payload.groupId, 'loan_disbursed');
  }

  @OnEvent('group.loan.repaid', { async: true })
  async onLoanRepaid(payload: { groupId: string; borrowerId: string; fullyRepaid: boolean }) {
    // Reward repayment behaviour with trust signal boost
    await this.updateBorrowerTrustContext(payload.borrowerId, payload.groupId, 'loan_repaid', payload.fullyRepaid);
  }

  @OnEvent('member.contribution', { async: true })
  async onContribution(payload: { userId: string; groupId: string }) {
    await this.updateBorrowerTrustContext(payload.userId, payload.groupId, 'contribution');
  }

  private async updateBorrowerTrustContext(
    userId: string,
    groupId: string,
    trigger: string,
    fullyRepaid?: boolean,
  ) {
    try {
      const profile = await this.prisma.groupEconomicProfile.findUnique({ where: { groupId } });
      const signals = this.extractor.extract(profile);

      // Adjust user trust score based on treasury signals
      const userProfile = await this.prisma.economicProfile.findUnique({ where: { userId } });
      if (!userProfile) return;

      let trustDelta = 0;
      if (trigger === 'loan_repaid') trustDelta = fullyRepaid ? 3 : 1;
      if (trigger === 'contribution') trustDelta = 1;
      if (trigger === 'loan_disbursed') trustDelta = 0; // neutral

      // Incorporate treasury health into user's participation score
      const participationBoost = signals.contributionMomentum > 70 ? 1 : 0;

      if (trustDelta + participationBoost > 0) {
        const newTrust = Math.min(100, userProfile.trustScore + trustDelta + participationBoost);
        await this.prisma.economicProfile.update({
          where: { userId },
          data: {
            trustScore: newTrust,
            participationScore: Math.min(100, userProfile.participationScore + participationBoost),
          },
        });
        this.logger.log(`Trust updated for user=${userId} trigger=${trigger} delta=${trustDelta + participationBoost}`);
      }
    } catch (e: any) {
      this.logger.error(`Treasury intelligence update failed: ${e.message}`);
    }
  }
}
