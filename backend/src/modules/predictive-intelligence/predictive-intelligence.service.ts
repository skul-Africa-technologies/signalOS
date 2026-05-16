import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RepaymentPredictionEngine, TrustEvolutionEngine, FraudProbabilityEngine } from './engines/prediction.engines';
import { TreasuryForecastEngine } from './engines/treasury-forecast.engine';
import { UnderwritingEngine, RecommendationEngine } from './engines/underwriting.engine';
import { PredictionStoreService } from './store/prediction-store.service';
import { PredictiveAnalyticsService } from './analytics/predictive-analytics.service';
import { AutonomousAdaptationService } from './autonomous/autonomous-adaptation.service';

@Injectable()
export class PredictiveIntelligenceService {
  private readonly logger = new Logger(PredictiveIntelligenceService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly repaymentEngine: RepaymentPredictionEngine,
    private readonly trustEngine: TrustEvolutionEngine,
    private readonly fraudEngine: FraudProbabilityEngine,
    private readonly treasuryEngine: TreasuryForecastEngine,
    private readonly underwriting: UnderwritingEngine,
    private readonly recommendations: RecommendationEngine,
    private readonly store: PredictionStoreService,
    private readonly analytics: PredictiveAnalyticsService,
    private readonly autonomy: AutonomousAdaptationService,
  ) {}

  async getUserPredictions(userId: string) {
    const [repayment, trust, fraud] = await Promise.all([
      this.repaymentEngine.predict(userId),
      this.trustEngine.forecast(userId),
      this.fraudEngine.forecast(userId),
    ]);
    return { userId, repayment, trust, fraud, generatedAt: new Date() };
  }

  async getTreasuryForecast(groupId: string) {
    return this.treasuryEngine.forecast(groupId);
  }

  async getUnderwritingRecommendation(userId: string, groupId?: string) {
    return this.underwriting.underwrite(userId, groupId);
  }

  async simulateLoan(params: { userId: string; groupId: string; loanAmount: number; durationMonths: number }) {
    return this.underwriting.simulate(params);
  }

  async getRecommendations(userId: string) {
    return this.recommendations.generate(userId);
  }

  async getTreasuryRecommendations(groupId: string) {
    return this.recommendations.generateForTreasury(groupId);
  }

  async getPredictionHistory(userId: string, type: string) {
    return this.store.getHistory(userId, type as any, 30);
  }

  async getPortfolioReport() {
    return this.analytics.generatePortfolioReport();
  }

  async getTreasuryReport() {
    return this.analytics.generateTreasuryReport();
  }

  async runAutonomousAdaptation(userId: string) {
    await Promise.allSettled([
      this.autonomy.adaptTrust(userId),
      this.autonomy.adaptFraud(userId),
    ]);
    return { userId, adapted: true, timestamp: new Date() };
  }

  async runTreasuryAdaptation(groupId: string) {
    await this.autonomy.adaptTreasury(groupId);
    return { groupId, adapted: true, timestamp: new Date() };
  }

  /** Scheduled: regenerate all user predictions (called by cron) */
  async batchRegeneratePredictions(userIds: string[]) {
    let processed = 0;
    for (const userId of userIds) {
      try {
        await this.repaymentEngine.predict(userId);
        await this.trustEngine.forecast(userId);
        processed++;
      } catch (e: any) {
        this.logger.error(`Batch prediction failed for ${userId}: ${e.message}`);
      }
    }
    return processed;
  }
}
