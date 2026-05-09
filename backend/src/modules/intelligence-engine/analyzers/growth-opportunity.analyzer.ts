import { Injectable } from '@nestjs/common';
import { EconomicSignals, IntelligenceScores, IntelligenceRecommendation } from '../interfaces/intelligence.interfaces';

export interface GrowthOpportunity {
  lever: string;
  currentValue: number;
  targetValue: number;
  impact: string;
  recommendation: IntelligenceRecommendation;
}

@Injectable()
export class GrowthOpportunityAnalyzer {
  analyze(signals: EconomicSignals, scores: IntelligenceScores): GrowthOpportunity[] {
    const opportunities: GrowthOpportunity[] = [];

    if (signals.savingsBehaviour < 60) {
      opportunities.push({
        lever: 'savingsBehaviour',
        currentValue: signals.savingsBehaviour,
        targetValue: 60,
        impact: 'Unlocks Silver tier and working capital loans',
        recommendation: {
          type: 'savings_improvement',
          priority: signals.savingsBehaviour < 20 ? 'high' : 'medium',
          recommendation: 'Increase savings contributions to 5+ per month to reach the Silver growth tier.',
        },
      });
    }

    if (signals.repaymentConsistency < 70) {
      opportunities.push({
        lever: 'repaymentConsistency',
        currentValue: signals.repaymentConsistency,
        targetValue: 70,
        impact: `Increases eligible loan amount by up to ₦${((70 - signals.repaymentConsistency) * 1_500).toLocaleString()}`,
        recommendation: {
          type: 'credit_readiness',
          priority: signals.repaymentConsistency < 40 ? 'high' : 'medium',
          recommendation: 'Complete more successful payments to improve repayment consistency and loan eligibility.',
        },
      });
    }

    if (signals.groupParticipation < 50) {
      opportunities.push({
        lever: 'groupParticipation',
        currentValue: signals.groupParticipation,
        targetValue: 50,
        impact: 'Boosts participation score and unlocks cooperative financial products',
        recommendation: {
          type: 'growth',
          priority: 'medium',
          recommendation: 'Actively contribute to savings groups to grow your participation score.',
        },
      });
    }

    if (scores.liquidityScore < 50) {
      opportunities.push({
        lever: 'liquidityScore',
        currentValue: scores.liquidityScore,
        targetValue: 50,
        impact: 'Reduces risk classification and improves loan terms',
        recommendation: {
          type: 'liquidity_optimization',
          priority: 'medium',
          recommendation: 'Reduce transaction amount variance to stabilise your liquidity score.',
        },
      });
    }

    // Sort by gap size (largest improvement opportunity first)
    return opportunities.sort((a, b) => (b.targetValue - b.currentValue) - (a.targetValue - a.currentValue));
  }
}
