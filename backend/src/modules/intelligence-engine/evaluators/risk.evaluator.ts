import { Injectable, Logger } from '@nestjs/common';
import { EconomicSignals, IntelligenceScores, RiskLevel, RiskReport } from '../interfaces/intelligence.interfaces';

interface RiskFactor {
  label: string;
  /** Returns a risk penalty (0–100) and a flag string if triggered */
  evaluate: (signals: EconomicSignals) => { penalty: number; flag: string | null };
}

const RISK_FACTORS: RiskFactor[] = [
  {
    label: 'inactivity',
    evaluate: (s) => ({
      penalty: s.activityLevel < 20 ? 30 : s.activityLevel < 40 ? 15 : 0,
      flag: s.activityLevel < 20 ? 'Prolonged inactivity detected' : null,
    }),
  },
  {
    label: 'paymentDecline',
    evaluate: (s) => ({
      penalty: s.repaymentConsistency < 30 ? 25 : s.repaymentConsistency < 50 ? 12 : 0,
      flag: s.repaymentConsistency < 30 ? 'Declining payment activity' : null,
    }),
  },
  {
    label: 'incomeInstability',
    evaluate: (s) => ({
      penalty: s.incomeStability < 25 ? 20 : s.incomeStability < 45 ? 10 : 0,
      flag: s.incomeStability < 25 ? 'Unstable income pattern' : null,
    }),
  },
  {
    label: 'cashflowVolatility',
    evaluate: (s) => ({
      // cashflowVolatility is already inverted (higher = more stable), so low value = high risk
      penalty: s.cashflowVolatility < 25 ? 15 : s.cashflowVolatility < 45 ? 8 : 0,
      flag: s.cashflowVolatility < 25 ? 'High cashflow volatility' : null,
    }),
  },
  {
    label: 'savingsAbsence',
    evaluate: (s) => ({
      penalty: s.savingsBehaviour < 10 ? 10 : 0,
      flag: s.savingsBehaviour < 10 ? 'No savings behaviour detected' : null,
    }),
  },
  {
    label: 'lowParticipation',
    evaluate: (s) => ({
      penalty: s.groupParticipation < 10 ? 5 : 0,
      flag: s.groupParticipation < 10 ? 'Low cooperative participation' : null,
    }),
  },
];

@Injectable()
export class RiskEvaluator {
  private readonly logger = new Logger(RiskEvaluator.name);

  evaluate(scores: IntelligenceScores, signals?: EconomicSignals): RiskLevel {
    if (!signals) return this.fromTrustScore(scores.trustScore);
    return this.evaluateDetailed(signals).riskLevel;
  }

  evaluateDetailed(signals: EconomicSignals): RiskReport {
    this.logger.debug('Evaluating detailed risk from signals');

    const flags: string[] = [];
    let totalPenalty = 0;

    for (const factor of RISK_FACTORS) {
      const { penalty, flag } = factor.evaluate(signals);
      totalPenalty += penalty;
      if (flag) flags.push(flag);
    }

    const riskScore = Math.min(100, totalPenalty);
    const riskLevel = this.fromRiskScore(riskScore);

    if (flags.length === 0) flags.push('No significant risk factors detected');

    this.logger.debug(`Risk score: ${riskScore} (${riskLevel}) — ${flags.length} flags`);

    return {
      riskLevel,
      riskScore,
      flags,
      volatilityDetected: signals.cashflowVolatility < 25,
      inactivityDetected: signals.activityLevel < 20,
    };
  }

  private fromRiskScore(riskScore: number): RiskLevel {
    if (riskScore <= 10) return 'Low';
    if (riskScore <= 30) return 'Medium';
    if (riskScore <= 55) return 'High';
    return 'Very High';
  }

  private fromTrustScore(trustScore: number): RiskLevel {
    if (trustScore >= 70) return 'Low';
    if (trustScore >= 50) return 'Medium';
    if (trustScore >= 30) return 'High';
    return 'Very High';
  }
}
