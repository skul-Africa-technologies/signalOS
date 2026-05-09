import { Injectable, Logger } from '@nestjs/common';
import {
  EconomicSignals,
  IntelligenceScores,
  LoanEligibilityResult,
  RiskLevel,
} from '../interfaces/intelligence.interfaces';
import { RepaymentConfidenceEvaluator } from './repayment-confidence.evaluator';

// Minimum trust score to qualify for any loan
const MIN_TRUST_SCORE = 40;

// Safe loan caps per risk tier (NGN)
const LOAN_CAPS: Record<RiskLevel, number> = {
  Low: 500_000,
  Medium: 200_000,
  High: 75_000,
  'Very High': 0,
};

// Loan product labels per risk tier
const LOAN_LABELS: Record<RiskLevel, string> = {
  Low: 'Eligible for micro expansion loan',
  Medium: 'Eligible for working capital loan',
  High: 'Eligible for starter micro-loan',
  'Very High': 'Not eligible at this time',
};

const NGN = new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 });

@Injectable()
export class LoanEligibilityEvaluator {
  private readonly logger = new Logger(LoanEligibilityEvaluator.name);

  constructor(private readonly repaymentConfidence: RepaymentConfidenceEvaluator) {}

  evaluate(signals: EconomicSignals, scores: IntelligenceScores, riskLevel: RiskLevel): LoanEligibilityResult {
    this.logger.debug(`Evaluating loan eligibility — trust=${scores.trustScore} risk=${riskLevel}`);

    const confidence = this.repaymentConfidence.evaluate(signals, scores);
    const eligible = scores.trustScore >= MIN_TRUST_SCORE && riskLevel !== 'Very High';
    const eligibleAmount = eligible ? this.calcAmount(scores.trustScore, riskLevel) : 0;
    const reasons = [...confidence.factors];

    if (!eligible) {
      reasons.push(`Trust score ${scores.trustScore} below minimum threshold of ${MIN_TRUST_SCORE}`);
    }

    const recommendation = eligible
      ? `${LOAN_LABELS[riskLevel]} up to ${NGN.format(eligibleAmount)}`
      : 'Build more transaction history to qualify for a loan';

    this.logger.debug(`Loan eligibility: ${eligible} — ${NGN.format(eligibleAmount)}`);

    return {
      eligible,
      eligibleAmount,
      confidenceLevel: confidence.level,
      riskLevel,
      recommendation,
      reasons,
    };
  }

  private calcAmount(trustScore: number, riskLevel: RiskLevel): number {
    // ₦5,000 per trust point above threshold, capped by risk tier
    const base = (trustScore - MIN_TRUST_SCORE) * 5_000;
    return Math.min(base, LOAN_CAPS[riskLevel]);
  }
}
