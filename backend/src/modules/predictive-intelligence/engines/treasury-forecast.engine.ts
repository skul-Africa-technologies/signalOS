import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { RuleBasedPredictionProvider } from '../providers/rule-based-prediction.provider';
import { PredictionStoreService } from '../store/prediction-store.service';
import { TreasuryForecast, PredictionTrajectory } from '../interfaces/prediction.interfaces';
import { PREDICTION_WINDOWS } from '../prediction.constants';

@Injectable()
export class TreasuryForecastEngine {
  private readonly logger = new Logger(TreasuryForecastEngine.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly provider: RuleBasedPredictionProvider,
    private readonly store: PredictionStoreService,
  ) {}

  async forecast(groupId: string): Promise<TreasuryForecast> {
    const [wallet, profile, snapshots, activeLoans, memberCount] = await Promise.all([
      this.prisma.savingsGroupWallet.findUnique({ where: { groupId } }),
      this.prisma.groupEconomicProfile.findUnique({ where: { groupId } }),
      this.prisma.treasurySnapshot.findMany({ where: { groupId }, orderBy: { createdAt: 'desc' }, take: 10 }),
      this.prisma.groupLoan.count({ where: { groupId, status: 'DISBURSED' } }),
      this.prisma.groupMember.count({ where: { groupId } }),
    ]);

    const currentBalance = (wallet?.availableBalance ?? 0) + (wallet?.reserveBalance ?? 0);
    const reserveRatio = currentBalance > 0 ? (wallet?.reserveBalance ?? 0) / currentBalance : 0;

    // Estimate monthly inflow from contribution trend
    const recentContributions = await this.prisma.contribution.findMany({
      where: { groupId, createdAt: { gte: new Date(Date.now() - 60 * 86400000) } },
    });
    const avgMonthlyInflow = recentContributions.reduce((s, c) => s + c.amount, 0) / 2;
    const avgMonthlyOutflow = (wallet?.totalLoansIssued ?? 0) / Math.max(snapshots.length, 1);

    const features = {
      sustainabilityScore: profile?.sustainabilityScore ?? 50,
      reserveRatio,
      activeLoans,
      memberCount,
      dataPoints: snapshots.length,
    };

    const [stabilityResult, riskResult] = await Promise.all([
      this.provider.predict({ groupId, features, predictionType: 'TREASURY_STABILITY' }),
      this.provider.predict({ groupId, features, predictionType: 'COOPERATIVE_RISK' }),
    ]);

    // Persist against a synthetic userId for the group
    const syntheticUserId = `group:${groupId}`;
    await Promise.all([
      this.store.save({ userId: syntheticUserId, predictionType: 'TREASURY_STABILITY', predictedValue: stabilityResult.predictedValue, confidence: stabilityResult.confidence, predictionWindow: PREDICTION_WINDOWS.MEDIUM, metadata: stabilityResult.metadata }),
      this.store.save({ userId: syntheticUserId, predictionType: 'COOPERATIVE_RISK', predictedValue: riskResult.predictedValue, confidence: riskResult.confidence, predictionWindow: PREDICTION_WINDOWS.MEDIUM, metadata: riskResult.metadata }),
    ]);

    const netFlow = avgMonthlyInflow - avgMonthlyOutflow;
    const projected30 = Math.max(0, currentBalance + netFlow);
    const projected90 = Math.max(0, currentBalance + netFlow * 3);
    const depletionRisk = projected90 <= 0 ? 1 : Math.max(0, 1 - stabilityResult.predictedValue);
    const trajectory = this.toTrajectory(currentBalance, projected90);
    const reserveAdequacy = reserveRatio >= 0.2 ? 'ADEQUATE' : reserveRatio >= 0.1 ? 'MARGINAL' : 'CRITICAL';

    return {
      groupId,
      currentBalance,
      projected30DayBalance: projected30,
      projected90DayBalance: projected90,
      depletionRisk,
      lendingCapacityForecast: wallet?.lendingPoolBalance ?? 0,
      reserveAdequacy,
      trajectory,
      confidence: stabilityResult.confidence,
    };
  }

  private toTrajectory(current: number, projected90: number): PredictionTrajectory {
    const ratio = projected90 / Math.max(current, 1);
    if (ratio > 1.1) return 'POSITIVE';
    if (ratio < 0.8) return 'DECLINING';
    if (projected90 < 5000) return 'CRITICAL';
    return 'STABLE';
  }
}
