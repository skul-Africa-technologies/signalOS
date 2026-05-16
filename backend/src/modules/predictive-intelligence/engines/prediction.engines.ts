import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { RuleBasedPredictionProvider } from '../providers/rule-based-prediction.provider';
import { PredictionStoreService } from '../store/prediction-store.service';
import { RepaymentPrediction, TrustEvolutionForecast, FraudProbabilityForecast, PredictionTrajectory } from '../interfaces/prediction.interfaces';
import { PREDICTION_WINDOWS } from '../prediction.constants';

@Injectable()
export class RepaymentPredictionEngine {
  private readonly logger = new Logger(RepaymentPredictionEngine.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly provider: RuleBasedPredictionProvider,
    private readonly store: PredictionStoreService,
  ) {}

  async predict(userId: string): Promise<RepaymentPrediction> {
    const [profile, wallet, overdueCount, dataPoints] = await Promise.all([
      this.prisma.economicProfile.findUnique({ where: { userId } }),
      this.prisma.wallet.findUnique({ where: { userId } }),
      this.prisma.loanRepaymentSchedule.count({ where: { loanId: { in: await this.getLoanIds(userId) }, status: 'OVERDUE' } }),
      this.prisma.transaction.count({ where: { userId } }),
    ]);

    const features = {
      repaymentConsistency: profile?.reliabilityScore ?? 50,
      trustScore: profile?.trustScore ?? 50,
      incomeStability: profile?.liquidityScore ?? 50,
      walletBalance: wallet?.availableBalance ?? 0,
      overdueCount,
      dataPoints,
    };

    const [successResult, defaultResult] = await Promise.all([
      this.provider.predict({ userId, features, predictionType: 'REPAYMENT_SUCCESS' }),
      this.provider.predict({ userId, features, predictionType: 'DEFAULT_RISK' }),
    ]);

    await Promise.all([
      this.store.save({ userId, predictionType: 'REPAYMENT_SUCCESS', predictedValue: successResult.predictedValue, confidence: successResult.confidence, predictionWindow: PREDICTION_WINDOWS.SHORT, metadata: successResult.metadata }),
      this.store.save({ userId, predictionType: 'DEFAULT_RISK', predictedValue: defaultResult.predictedValue, confidence: defaultResult.confidence, predictionWindow: PREDICTION_WINDOWS.SHORT, metadata: defaultResult.metadata }),
    ]);

    const riskFactors: string[] = [];
    if (overdueCount > 0) riskFactors.push(`${overdueCount} overdue installment(s) detected`);
    if ((profile?.trustScore ?? 0) < 40) riskFactors.push('Low trust score increases default risk');
    if ((wallet?.availableBalance ?? 0) < 1000) riskFactors.push('Low wallet balance detected');
    if ((profile?.reliabilityScore ?? 0) < 40) riskFactors.push('Inconsistent repayment history');

    return {
      repaymentProbability: successResult.predictedValue,
      defaultRisk: defaultResult.predictedValue,
      lateProbability: Math.max(0, defaultResult.predictedValue - 0.1),
      confidence: (successResult.confidence + defaultResult.confidence) / 2,
      riskFactors,
    };
  }

  private async getLoanIds(userId: string): Promise<string[]> {
    const loans = await this.prisma.loanDisbursement.findMany({ where: { userId }, select: { id: true } });
    return loans.map((l) => l.id);
  }
}

@Injectable()
export class TrustEvolutionEngine {
  private readonly logger = new Logger(TrustEvolutionEngine.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly provider: RuleBasedPredictionProvider,
    private readonly store: PredictionStoreService,
  ) {}

  async forecast(userId: string): Promise<TrustEvolutionForecast> {
    const [profile, snapshots, dataPoints] = await Promise.all([
      this.prisma.economicProfile.findUnique({ where: { userId } }),
      this.prisma.intelligenceSnapshot.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 5 }),
      this.prisma.transaction.count({ where: { userId } }),
    ]);

    const currentTrust = profile?.trustScore ?? 0;
    const trustVelocity = snapshots.length >= 2
      ? snapshots[0].trustScore - snapshots[snapshots.length - 1].trustScore
      : 0;

    const features = {
      trustScore: currentTrust,
      trustVelocity,
      activityLevel: profile?.activityLevel ?? 50,
      repaymentConsistency: profile?.reliabilityScore ?? 50,
      dataPoints,
    };

    const result = await this.provider.predict({ userId, features, predictionType: 'TRUST_EVOLUTION' });
    await this.store.save({ userId, predictionType: 'TRUST_EVOLUTION', predictedValue: result.predictedValue, confidence: result.confidence, predictionWindow: PREDICTION_WINDOWS.MEDIUM, metadata: result.metadata });

    const meta = result.metadata as Record<string, number>;
    const predicted30 = meta.predicted30DayTrust ?? result.predictedValue;
    const predicted90 = meta.predicted90DayTrust ?? result.predictedValue;
    const trajectory = this.toTrajectory(currentTrust, predicted90);

    const drivers: string[] = [];
    if (trustVelocity > 2) drivers.push('Consistent recent activity improving trust');
    if ((profile?.reliabilityScore ?? 0) > 70) drivers.push('Strong repayment reliability');
    if ((profile?.activityLevel ?? 0) > 70) drivers.push('High transaction activity');
    if (trustVelocity < -2) drivers.push('Recent inactivity causing trust decay');

    return { currentTrust, predicted30DayTrust: predicted30, predicted90DayTrust: predicted90, trajectory, confidence: result.confidence, drivers };
  }

  private toTrajectory(current: number, predicted90: number): PredictionTrajectory {
    const delta = predicted90 - current;
    if (delta > 5) return 'POSITIVE';
    if (delta < -5) return 'DECLINING';
    if (current < 25) return 'CRITICAL';
    return 'STABLE';
  }
}

@Injectable()
export class FraudProbabilityEngine {
  constructor(
    private readonly prisma: PrismaService,
    private readonly provider: RuleBasedPredictionProvider,
    private readonly store: PredictionStoreService,
  ) {}

  async forecast(userId: string): Promise<FraudProbabilityForecast> {
    const [riskAssessments, recentTx, dataPoints] = await Promise.all([
      this.prisma.riskAssessment.findMany({ where: { userId }, orderBy: { assessedAt: 'desc' }, take: 5 }),
      this.prisma.transaction.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 20 }),
      this.prisma.transaction.count({ where: { userId } }),
    ]);

    const latestRisk = riskAssessments[0];
    const anomalyCount = riskAssessments.filter((r) => r.volatilityDetected).length;
    const failedTx = recentTx.filter((t) => t.status === 'FAILED').length;

    // Detect velocity spike: >5 tx in last hour
    const oneHourAgo = new Date(Date.now() - 3600000);
    const velocitySpike = recentTx.filter((t) => new Date(t.createdAt) > oneHourAgo).length > 5 ? 1 : 0;

    const features = {
      riskScore: latestRisk?.riskScore ?? 50,
      anomalyCount,
      velocitySpike,
      failedAttempts: failedTx,
      dataPoints,
    };

    const result = await this.provider.predict({ userId, features, predictionType: 'FRAUD_PROBABILITY' });
    await this.store.save({ userId, predictionType: 'FRAUD_PROBABILITY', predictedValue: result.predictedValue, confidence: result.confidence, predictionWindow: PREDICTION_WINDOWS.SHORT, metadata: result.metadata });

    const anomalySignals: string[] = [];
    if (velocitySpike) anomalySignals.push('High transaction velocity detected');
    if (failedTx > 2) anomalySignals.push('Multiple failed transactions');
    if (anomalyCount > 2) anomalySignals.push('Repeated volatility flags in risk history');

    return {
      fraudProbability: result.predictedValue,
      accountCompromiseProbability: result.predictedValue * 0.6,
      behavioralDriftScore: anomalyCount * 0.15,
      coordinatedAbuseRisk: velocitySpike * 0.4,
      confidence: result.confidence,
      anomalySignals,
    };
  }
}
