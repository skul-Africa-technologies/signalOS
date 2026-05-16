import { Injectable } from '@nestjs/common';
import { TransactionStatus } from '../../common/prisma-enums';
import { Transaction } from '@prisma/client';

export type RiskLevel = 'Low' | 'Medium' | 'High' | 'Very High';

export interface ScoreReport {
  trustScore: number;
  riskLevel: RiskLevel;
  reasons: string[];
  breakdown: Record<string, number>;
}

interface ScoringFactor {
  name: string;
  weight: number;
  compute: (txns: Transaction[], savingsContributions: number) => { score: number; reason: string | null };
}

@Injectable()
export class ScoringEngine {
  private readonly factors: ScoringFactor[] = [
    {
      name: 'transactionConsistency',
      weight: 30,
      compute: (txns, _s) => {
        const successful = txns.filter((t) => t.status === TransactionStatus.SUCCESS);
        const rate = txns.length > 0 ? successful.length / txns.length : 0;
        const score = Math.round(rate * 100);
        const reason =
          rate >= 0.8
            ? 'Consistent transaction activity'
            : rate >= 0.5
            ? 'Moderate transaction consistency'
            : txns.length === 0
            ? null
            : 'Low transaction success rate';
        return { score, reason };
      },
    },
    {
      name: 'paymentFrequency',
      weight: 25,
      compute: (txns, _s) => {
        const successful = txns.filter((t) => t.status === TransactionStatus.SUCCESS);
        const score = Math.min(100, Math.round((successful.length / 20) * 100));
        const reason =
          successful.length >= 10
            ? 'Strong payment frequency'
            : successful.length >= 5
            ? 'Regular payment activity'
            : successful.length >= 1
            ? 'Early payment activity detected'
            : null;
        return { score, reason };
      },
    },
    {
      name: 'savingsReliability',
      weight: 25,
      compute: (txns, savingsContributions) => {
        const score = Math.min(100, savingsContributions * 20); // 5 contributions = full score
        const reason =
          savingsContributions >= 3
            ? 'Reliable savings contributions'
            : savingsContributions >= 1
            ? 'Savings activity detected'
            : null;
        return { score, reason };
      },
    },
    {
      name: 'activityLevel',
      weight: 20,
      compute: (txns, _s) => {
        if (txns.length === 0) return { score: 0, reason: null };
        const now = Date.now();
        const last = new Date(txns[txns.length - 1].createdAt).getTime();
        const daysSinceLast = (now - last) / 86_400_000;
        // Full score if active within 7 days, zero at 90 days
        const score = Math.max(0, Math.round(100 - (daysSinceLast / 90) * 100));
        const reason =
          daysSinceLast <= 7
            ? 'Recently active on platform'
            : daysSinceLast <= 30
            ? 'Active within the last month'
            : 'Low recent activity';
        return { score, reason };
      },
    },
  ];

  evaluate(txns: Transaction[], savingsContributions = 0): ScoreReport {
    const breakdown: Record<string, number> = {};
    const reasons: string[] = [];
    let weightedTotal = 0;

    for (const factor of this.factors) {
      const { score, reason } = factor.compute(txns, savingsContributions);
      const weighted = Math.round((score * factor.weight) / 100);
      breakdown[factor.name] = score;
      weightedTotal += weighted;
      if (reason) reasons.push(reason);
    }

    const trustScore = Math.min(100, weightedTotal);
    const riskLevel = this.toRiskLevel(trustScore);

    if (reasons.length === 0) reasons.push('Insufficient transaction history');

    return { trustScore, riskLevel, reasons, breakdown };
  }

  private toRiskLevel(score: number): RiskLevel {
    if (score >= 70) return 'Low';
    if (score >= 50) return 'Medium';
    if (score >= 30) return 'High';
    return 'Very High';
  }
}
