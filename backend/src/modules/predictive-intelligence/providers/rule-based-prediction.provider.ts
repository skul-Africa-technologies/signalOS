import { Injectable } from '@nestjs/common';
import { PredictionProvider, PredictionProviderInput, PredictionResult, PredictionConfidenceLevel } from '../interfaces/prediction.interfaces';
import { PREDICTION_TTL_HOURS } from '../prediction.constants';

/**
 * Built-in rule-based prediction provider.
 * Designed as a pluggable interface — swap with Python ML / TensorFlow / OpenAI
 * by implementing PredictionProvider and registering it in the module.
 */
@Injectable()
export class RuleBasedPredictionProvider implements PredictionProvider {
  providerName() { return 'rule-based-v1'; }
  isAvailable() { return true; }

  async predict(input: PredictionProviderInput): Promise<PredictionResult> {
    const f = input.features as Record<string, number>;
    const ttlHours = PREDICTION_TTL_HOURS[input.predictionType] ?? 24;
    const expiresAt = new Date(Date.now() + ttlHours * 3600 * 1000);

    switch (input.predictionType) {
      case 'DEFAULT_RISK': return this.predictDefaultRisk(f, expiresAt);
      case 'REPAYMENT_SUCCESS': return this.predictRepaymentSuccess(f, expiresAt);
      case 'TRUST_EVOLUTION': return this.predictTrustEvolution(f, expiresAt);
      case 'FRAUD_PROBABILITY': return this.predictFraudProbability(f, expiresAt);
      case 'TREASURY_STABILITY': return this.predictTreasuryStability(f, expiresAt);
      case 'LIQUIDITY_FORECAST': return this.predictLiquidityForecast(f, expiresAt);
      case 'COOPERATIVE_RISK': return this.predictCooperativeRisk(f, expiresAt);
      default: return this.fallback(input.predictionType, expiresAt);
    }
  }

  private predictDefaultRisk(f: Record<string, number>, expiresAt: Date): PredictionResult {
    const repaymentConsistency = f.repaymentConsistency ?? 50;
    const trustScore = f.trustScore ?? 50;
    const walletBalance = f.walletBalance ?? 0;
    const overdueCount = f.overdueCount ?? 0;

    let risk = 0.5;
    risk -= (repaymentConsistency / 100) * 0.3;
    risk -= (trustScore / 100) * 0.25;
    risk += overdueCount * 0.08;
    if (walletBalance < 1000) risk += 0.1;
    risk = Math.max(0.01, Math.min(0.99, risk));

    const confidence = this.calcConfidence(f.dataPoints ?? 0);
    return {
      predictionType: 'DEFAULT_RISK',
      predictedValue: risk,
      confidence: confidence.value,
      confidenceLevel: confidence.level,
      metadata: { repaymentConsistency, trustScore, overdueCount, provider: 'rule-based-v1' },
      expiresAt,
    };
  }

  private predictRepaymentSuccess(f: Record<string, number>, expiresAt: Date): PredictionResult {
    const repaymentConsistency = f.repaymentConsistency ?? 50;
    const trustScore = f.trustScore ?? 50;
    const incomeStability = f.incomeStability ?? 50;
    const walletBalance = f.walletBalance ?? 0;

    let prob = 0.4;
    prob += (repaymentConsistency / 100) * 0.35;
    prob += (trustScore / 100) * 0.25;
    prob += (incomeStability / 100) * 0.2;
    if (walletBalance > 5000) prob += 0.05;
    prob = Math.max(0.01, Math.min(0.99, prob));

    const confidence = this.calcConfidence(f.dataPoints ?? 0);
    return {
      predictionType: 'REPAYMENT_SUCCESS',
      predictedValue: prob,
      confidence: confidence.value,
      confidenceLevel: confidence.level,
      metadata: { repaymentConsistency, trustScore, incomeStability, provider: 'rule-based-v1' },
      expiresAt,
    };
  }

  private predictTrustEvolution(f: Record<string, number>, expiresAt: Date): PredictionResult {
    const currentTrust = f.trustScore ?? 50;
    const velocity = f.trustVelocity ?? 0; // recent delta
    const activityLevel = f.activityLevel ?? 50;
    const repaymentConsistency = f.repaymentConsistency ?? 50;

    const monthlyGrowth = (velocity * 0.4) + ((activityLevel - 50) / 100) * 3 + ((repaymentConsistency - 50) / 100) * 2;
    const predicted30 = Math.max(0, Math.min(100, currentTrust + monthlyGrowth));
    const predicted90 = Math.max(0, Math.min(100, currentTrust + monthlyGrowth * 3));

    const confidence = this.calcConfidence(f.dataPoints ?? 0);
    return {
      predictionType: 'TRUST_EVOLUTION',
      predictedValue: predicted30,
      confidence: confidence.value,
      confidenceLevel: confidence.level,
      metadata: { currentTrust, predicted30DayTrust: predicted30, predicted90DayTrust: predicted90, monthlyGrowth, provider: 'rule-based-v1' },
      expiresAt,
    };
  }

  private predictFraudProbability(f: Record<string, number>, expiresAt: Date): PredictionResult {
    const riskScore = f.riskScore ?? 50;
    const anomalyCount = f.anomalyCount ?? 0;
    const velocitySpike = f.velocitySpike ?? 0;
    const failedAttempts = f.failedAttempts ?? 0;

    let prob = 0.05;
    prob += (riskScore / 100) * 0.3;
    prob += anomalyCount * 0.05;
    prob += velocitySpike * 0.1;
    prob += failedAttempts * 0.03;
    prob = Math.max(0.01, Math.min(0.99, prob));

    const confidence = this.calcConfidence(f.dataPoints ?? 0);
    return {
      predictionType: 'FRAUD_PROBABILITY',
      predictedValue: prob,
      confidence: confidence.value,
      confidenceLevel: confidence.level,
      metadata: { riskScore, anomalyCount, velocitySpike, provider: 'rule-based-v1' },
      expiresAt,
    };
  }

  private predictTreasuryStability(f: Record<string, number>, expiresAt: Date): PredictionResult {
    const sustainabilityScore = f.sustainabilityScore ?? 50;
    const reserveRatio = f.reserveRatio ?? 0.2;
    const activeLoans = f.activeLoans ?? 0;
    const memberCount = f.memberCount ?? 1;

    let stability = sustainabilityScore / 100;
    if (reserveRatio < 0.15) stability -= 0.2;
    if (activeLoans / Math.max(memberCount, 1) > 0.5) stability -= 0.15;
    stability = Math.max(0.01, Math.min(0.99, stability));

    const confidence = this.calcConfidence(f.dataPoints ?? 0);
    return {
      predictionType: 'TREASURY_STABILITY',
      predictedValue: stability,
      confidence: confidence.value,
      confidenceLevel: confidence.level,
      metadata: { sustainabilityScore, reserveRatio, activeLoans, provider: 'rule-based-v1' },
      expiresAt,
    };
  }

  private predictLiquidityForecast(f: Record<string, number>, expiresAt: Date): PredictionResult {
    const walletBalance = f.walletBalance ?? 0;
    const avgMonthlyOutflow = f.avgMonthlyOutflow ?? 0;
    const avgMonthlyInflow = f.avgMonthlyInflow ?? 0;

    const netFlow = avgMonthlyInflow - avgMonthlyOutflow;
    const projected30 = walletBalance + netFlow;
    const liquidityScore = projected30 > 0 ? Math.min(1, projected30 / Math.max(avgMonthlyOutflow, 1)) : 0;

    const confidence = this.calcConfidence(f.dataPoints ?? 0);
    return {
      predictionType: 'LIQUIDITY_FORECAST',
      predictedValue: Math.max(0, Math.min(1, liquidityScore)),
      confidence: confidence.value,
      confidenceLevel: confidence.level,
      metadata: { walletBalance, projected30DayBalance: projected30, netFlow, provider: 'rule-based-v1' },
      expiresAt,
    };
  }

  private predictCooperativeRisk(f: Record<string, number>, expiresAt: Date): PredictionResult {
    const repaymentPerformance = f.repaymentPerformance ?? 50;
    const memberParticipation = f.memberParticipation ?? 50;
    const reserveRatio = f.reserveRatio ?? 0.2;

    let risk = 0.5;
    risk -= (repaymentPerformance / 100) * 0.35;
    risk -= (memberParticipation / 100) * 0.25;
    if (reserveRatio >= 0.2) risk -= 0.1;
    risk = Math.max(0.01, Math.min(0.99, risk));

    const confidence = this.calcConfidence(f.dataPoints ?? 0);
    return {
      predictionType: 'COOPERATIVE_RISK',
      predictedValue: risk,
      confidence: confidence.value,
      confidenceLevel: confidence.level,
      metadata: { repaymentPerformance, memberParticipation, reserveRatio, provider: 'rule-based-v1' },
      expiresAt,
    };
  }

  private fallback(type: string, expiresAt: Date): PredictionResult {
    return {
      predictionType: type as any,
      predictedValue: 0.5,
      confidence: 0.3,
      confidenceLevel: 'LOW',
      metadata: { provider: 'rule-based-v1', fallback: true },
      expiresAt,
    };
  }

  private calcConfidence(dataPoints: number): { value: number; level: PredictionConfidenceLevel } {
    if (dataPoints >= 20) return { value: 0.88, level: 'HIGH' };
    if (dataPoints >= 8) return { value: 0.65, level: 'MEDIUM' };
    return { value: 0.40, level: 'LOW' };
  }
}
