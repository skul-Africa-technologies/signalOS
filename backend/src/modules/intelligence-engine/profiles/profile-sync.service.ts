import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EconomicProfileService } from './economic-profile.service';
import { EconomicProfileBuilder } from './economic-profile.builder';
import { ScoreCalculator } from '../calculators/score.calculator';
import { RiskEvaluator } from '../evaluators/risk.evaluator';
import { SignalExtractor } from '../extractors/signal.extractor';
import { PrismaService } from '../../../prisma/prisma.service';
import { INTELLIGENCE_EVENTS } from '../intelligence.constants';
import { IntelligenceScores } from '../interfaces/intelligence.interfaces';

@Injectable()
export class ProfileSyncService {
  private readonly logger = new Logger(ProfileSyncService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly signalExtractor: SignalExtractor,
    private readonly scoreCalculator: ScoreCalculator,
    private readonly riskEvaluator: RiskEvaluator,
    private readonly profileBuilder: EconomicProfileBuilder,
    private readonly profileService: EconomicProfileService,
  ) {}

  /** Triggered after every intelligence analysis cycle */
  @OnEvent(INTELLIGENCE_EVENTS.PROFILE_UPDATED)
  async onProfileUpdated(payload: { userId: string; scores: IntelligenceScores }): Promise<void> {
    this.logger.debug(`Profile sync triggered for user ${payload.userId}`);
    await this.sync(payload.userId);
  }

  /** Triggered by payment success — immediate lightweight sync */
  @OnEvent('payment.success')
  async onPaymentSuccess(payload: { userId: string }): Promise<void> {
    await this.sync(payload.userId);
  }

  /** Triggered by savings contribution */
  @OnEvent('savings.contribution.created')
  async onContribution(payload: { userId: string }): Promise<void> {
    await this.sync(payload.userId);
  }

  async sync(userId: string): Promise<void> {
    try {
      const [transactions, contributions, memberships] = await Promise.all([
        this.prisma.transaction.findMany({ where: { userId }, orderBy: { createdAt: 'asc' } }),
        this.prisma.contribution.findMany({ where: { userId }, orderBy: { createdAt: 'asc' } }),
        this.prisma.groupMember.findMany({ where: { userId } }),
      ]);

      const signals = this.signalExtractor.extract(transactions, contributions, memberships);
      const scores = this.scoreCalculator.calculate(signals);
      const riskLevel = this.riskEvaluator.evaluate(scores);
      const record = this.profileBuilder.build(userId, signals, scores, riskLevel);

      await this.profileService.syncProfile(userId, record);

      this.logger.log(`Profile synced for ${userId}: trust=${scores.trustScore} risk=${riskLevel}`);
    } catch (err) {
      this.logger.error(`Profile sync failed for ${userId}: ${(err as Error).message}`);
    }
  }
}
