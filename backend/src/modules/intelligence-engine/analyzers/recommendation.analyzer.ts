import { Injectable } from '@nestjs/common';
import {
  EconomicSignals,
  IntelligenceScores,
  IntelligenceRecommendation,
} from '../interfaces/intelligence.interfaces';

interface RecommendationRule {
  type: IntelligenceRecommendation['type'];
  priority: IntelligenceRecommendation['priority'];
  condition: (s: EconomicSignals, sc: IntelligenceScores) => boolean;
  text: (s: EconomicSignals, sc: IntelligenceScores) => string;
}

const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 };

const RULES: RecommendationRule[] = [
  // Credit readiness
  {
    type: 'credit_readiness',
    priority: 'high',
    condition: (s) => s.repaymentConsistency < 40,
    text: () => 'Improve payment consistency to unlock loan access — aim for 5+ successful payments.',
  },
  {
    type: 'credit_readiness',
    priority: 'medium',
    condition: (s) => s.repaymentConsistency >= 40 && s.repaymentConsistency < 70,
    text: (s) =>
      `Your repayment rate is ${s.repaymentConsistency}%. Reach 70% to qualify for larger loan amounts.`,
  },
  // Savings improvement
  {
    type: 'savings_improvement',
    priority: 'high',
    condition: (s) => s.savingsBehaviour < 20,
    text: () => 'Join a savings group and make regular contributions to build your financial profile.',
  },
  {
    type: 'savings_improvement',
    priority: 'medium',
    condition: (s) => s.savingsBehaviour >= 20 && s.contributionReliability < 50,
    text: () => 'Increase contribution consistency to unlock higher working capital access.',
  },
  // Contribution consistency
  {
    type: 'contribution_consistency',
    priority: 'medium',
    condition: (s) => s.contributionReliability < 40 && s.savingsBehaviour >= 20,
    text: () => 'Keep contribution amounts consistent — irregular amounts reduce your reliability score.',
  },
  // Liquidity optimization
  {
    type: 'liquidity_optimization',
    priority: 'high',
    condition: (s) => s.cashflowVolatility < 25,
    text: () => 'High cashflow volatility detected — stabilise transaction amounts to improve liquidity score.',
  },
  {
    type: 'liquidity_optimization',
    priority: 'medium',
    condition: (s) => s.activityLevel < 30,
    text: () => 'Resume regular transactions to maintain your liquidity profile and trust score.',
  },
  // Growth
  {
    type: 'growth',
    priority: 'medium',
    condition: (s) => s.groupParticipation < 30,
    text: () => 'Join cooperative groups to boost your participation score and access group-based financial products.',
  },
  {
    type: 'growth',
    priority: 'low',
    condition: (_, sc) => sc.trustScore >= 70,
    text: (_, sc) =>
      `Your trust score is ${sc.trustScore} — you qualify for premium financial products. Maintain your activity.`,
  },
];

@Injectable()
export class RecommendationAnalyzer {
  analyze(signals: EconomicSignals, scores: IntelligenceScores): IntelligenceRecommendation[] {
    const matched = RULES
      .filter((r) => r.condition(signals, scores))
      .map((r) => ({ type: r.type, priority: r.priority, recommendation: r.text(signals, scores) }));

    // Deduplicate by type (keep highest priority per type), then sort
    const deduped = new Map<string, IntelligenceRecommendation>();
    for (const rec of matched) {
      const existing = deduped.get(rec.type);
      if (!existing || PRIORITY_ORDER[rec.priority] < PRIORITY_ORDER[existing.priority]) {
        deduped.set(rec.type, rec);
      }
    }

    return [...deduped.values()].sort(
      (a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority],
    );
  }
}
