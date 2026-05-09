import { Injectable, Logger } from '@nestjs/common';
import { EconomicSignals, TrustReport, RiskLevel } from '../interfaces/intelligence.interfaces';
import {
  TRUST_FACTORS,
  FACTOR_LABEL_THRESHOLDS,
  MIN_TRUST_DATA_POINTS,
} from './score-weights.constants';

@Injectable()
export class TrustScoreCalculator {
  private readonly logger = new Logger(TrustScoreCalculator.name);

  calculate(signals: EconomicSignals, dataPoints: number): TrustReport {
    this.logger.debug('Calculating trust score');

    if (dataPoints < MIN_TRUST_DATA_POINTS) {
      return this.insufficientDataReport();
    }

    const signalMap = signals as unknown as Record<string, number>;
    const reasons: string[] = [];
    const factorBreakdown: Record<string, number> = {};
    let weightedTotal = 0;

    for (const factor of TRUST_FACTORS) {
      const raw = signalMap[factor.key] ?? 0;
      const contribution = Math.round((raw * factor.weight) / 100);
      factorBreakdown[factor.key] = raw;
      weightedTotal += contribution;
      reasons.push(this.labelFactor(raw, factor.labels));
    }

    const trustScore = Math.min(100, weightedTotal);
    const riskLevel = this.toRiskLevel(trustScore);
    const confidence = this.toConfidence(dataPoints);

    this.logger.debug(`Trust score: ${trustScore} (${riskLevel}) — ${dataPoints} data points`);

    return { trustScore, riskLevel, confidence, reasons, factorBreakdown };
  }

  private labelFactor(
    value: number,
    labels: { high: string; medium: string; low: string },
  ): string {
    if (value >= FACTOR_LABEL_THRESHOLDS.HIGH) return labels.high;
    if (value >= FACTOR_LABEL_THRESHOLDS.MEDIUM) return labels.medium;
    return labels.low;
  }

  private toRiskLevel(score: number): RiskLevel {
    if (score >= 70) return 'Low';
    if (score >= 50) return 'Medium';
    if (score >= 30) return 'High';
    return 'Very High';
  }

  private toConfidence(dataPoints: number): 'High' | 'Medium' | 'Low' {
    if (dataPoints >= 20) return 'High';
    if (dataPoints >= 8) return 'Medium';
    return 'Low';
  }

  private insufficientDataReport(): TrustReport {
    return {
      trustScore: 0,
      riskLevel: 'Very High',
      confidence: 'Low',
      reasons: ['Insufficient transaction history to generate trust score'],
      factorBreakdown: {},
    };
  }
}
