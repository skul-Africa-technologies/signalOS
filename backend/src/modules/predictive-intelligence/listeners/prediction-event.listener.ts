import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { RepaymentPredictionEngine, TrustEvolutionEngine, FraudProbabilityEngine } from '../engines/prediction.engines';
import { TreasuryForecastEngine } from '../engines/treasury-forecast.engine';
import { AutonomousAdaptationService } from '../autonomous/autonomous-adaptation.service';
import { RecommendationEngine } from '../engines/underwriting.engine';
import { PrismaService } from '../../../prisma/prisma.service';

/**
 * Event-driven prediction propagation.
 * Every financial event triggers autonomous prediction recalculation.
 */
@Injectable()
export class PredictionEventListener {
  private readonly logger = new Logger(PredictionEventListener.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly repaymentEngine: RepaymentPredictionEngine,
    private readonly trustEngine: TrustEvolutionEngine,
    private readonly fraudEngine: FraudProbabilityEngine,
    private readonly treasuryEngine: TreasuryForecastEngine,
    private readonly autonomy: AutonomousAdaptationService,
    private readonly recommendations: RecommendationEngine,
  ) {}

  @OnEvent('loan.repayment.completed')
  async onRepaymentCompleted(payload: { userId: string; loanId: string }) {
    this.logger.log(`[PREDICTION] Repayment completed for ${payload.userId} — recalculating predictions`);
    await this.recalculateUserPredictions(payload.userId);
  }

  @OnEvent('loan.repayment.overdue')
  async onRepaymentOverdue(payload: { userId: string }) {
    this.logger.log(`[PREDICTION] Repayment overdue for ${payload.userId} — escalating risk predictions`);
    await this.recalculateUserPredictions(payload.userId);
    await this.autonomy.adaptTrust(payload.userId);
    await this.autonomy.adaptFraud(payload.userId);
  }

  @OnEvent('loan.default.detected')
  async onDefaultDetected(payload: { userId: string }) {
    this.logger.warn(`[PREDICTION] Default detected for ${payload.userId} — full prediction refresh`);
    await this.recalculateUserPredictions(payload.userId);
    await this.autonomy.adaptTrust(payload.userId);
    await this.autonomy.adaptFraud(payload.userId);
  }

  @OnEvent('intelligence.scores.computed')
  async onScoresComputed(payload: { userId: string }) {
    this.logger.log(`[PREDICTION] Scores computed for ${payload.userId} — refreshing trust trajectory`);
    await this.trustEngine.forecast(payload.userId).catch((e) =>
      this.logger.error(`Trust forecast failed: ${e.message}`),
    );
    await this.autonomy.adaptTrust(payload.userId);
  }

  @OnEvent('fraud.detected')
  async onFraudDetected(payload: { userId: string }) {
    this.logger.warn(`[PREDICTION] Fraud detected for ${payload.userId} — updating fraud forecast`);
    await this.fraudEngine.forecast(payload.userId);
    await this.autonomy.adaptFraud(payload.userId);
  }

  @OnEvent('treasury.health.changed')
  async onTreasuryHealthChanged(payload: { groupId: string }) {
    this.logger.log(`[PREDICTION] Treasury health changed for group ${payload.groupId} — recalculating forecast`);
    await this.autonomy.adaptTreasury(payload.groupId);
  }

  @OnEvent('cooperative.contribution.created')
  async onContributionCreated(payload: { groupId: string; userId: string }) {
    await Promise.all([
      this.treasuryEngine.forecast(payload.groupId).catch(() => null),
      this.recalculateUserPredictions(payload.userId),
    ]);
  }

  private async recalculateUserPredictions(userId: string) {
    await Promise.allSettled([
      this.repaymentEngine.predict(userId),
      this.trustEngine.forecast(userId),
      this.fraudEngine.forecast(userId),
      this.autonomy.adaptTrust(userId),
    ]);
  }
}
