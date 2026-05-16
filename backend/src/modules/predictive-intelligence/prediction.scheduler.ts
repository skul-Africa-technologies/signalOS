import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { RepaymentPredictionEngine, TrustEvolutionEngine, FraudProbabilityEngine } from './engines/prediction.engines';
import { TreasuryForecastEngine } from './engines/treasury-forecast.engine';
import { AutonomousAdaptationService } from './autonomous/autonomous-adaptation.service';

@Injectable()
export class PredictionSchedulerService {
  private readonly logger = new Logger(PredictionSchedulerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly repaymentEngine: RepaymentPredictionEngine,
    private readonly trustEngine: TrustEvolutionEngine,
    private readonly fraudEngine: FraudProbabilityEngine,
    private readonly treasuryEngine: TreasuryForecastEngine,
    private readonly autonomy: AutonomousAdaptationService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async refreshUserPredictions() {
    const users = await this.prisma.user.findMany({ select: { id: true }, take: 500 });
    for (const user of users) {
      await Promise.allSettled([
        this.repaymentEngine.predict(user.id),
        this.trustEngine.forecast(user.id),
        this.autonomy.adaptTrust(user.id),
      ]);
    }
    this.logger.log(`[SCHEDULER] Daily predictions refreshed for ${users.length} users`);
  }

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async refreshTreasuryForecasts() {
    const groups = await this.prisma.savingsGroup.findMany({ select: { id: true } });
    for (const group of groups) {
      await Promise.allSettled([
        this.treasuryEngine.forecast(group.id),
        this.autonomy.adaptTreasury(group.id),
      ]);
    }
    this.logger.log(`[SCHEDULER] Treasury forecasts refreshed for ${groups.length} groups`);
  }

  @Cron('0 */6 * * *')
  async fraudProbabilitySweep() {
    const highRisk = await this.prisma.economicProfile.findMany({
      where: { riskLevel: { in: ['High', 'Very High'] } },
      select: { userId: true },
    });
    for (const p of highRisk) {
      await Promise.allSettled([
        this.fraudEngine.forecast(p.userId),
        this.autonomy.adaptFraud(p.userId),
      ]);
    }
    this.logger.log(`[SCHEDULER] Fraud sweep for ${highRisk.length} high-risk users`);
  }

  @Cron(CronExpression.EVERY_WEEK)
  async cleanExpiredPredictions() {
    const result = await this.prisma.predictionSnapshot.deleteMany({
      where: { expiresAt: { lt: new Date(Date.now() - 7 * 86400000) } },
    });
    this.logger.log(`[SCHEDULER] Cleaned ${result.count} expired prediction snapshots`);
  }
}
