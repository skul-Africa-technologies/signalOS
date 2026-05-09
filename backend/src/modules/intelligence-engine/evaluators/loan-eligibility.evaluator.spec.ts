import { LoanEligibilityEvaluator } from '../evaluators/loan-eligibility.evaluator';
import { RepaymentConfidenceEvaluator } from '../evaluators/repayment-confidence.evaluator';
import { EconomicSignals, IntelligenceScores } from '../interfaces/intelligence.interfaces';

const evaluator = new LoanEligibilityEvaluator(new RepaymentConfidenceEvaluator());

const scores = (trust: number, overrides: Partial<IntelligenceScores> = {}): IntelligenceScores => ({
  trustScore: trust, reliabilityScore: 70, liquidityScore: 65,
  employabilityScore: 60, growthScore: 55, consistencyScore: 65, participationScore: 50,
  ...overrides,
});

const signals = (): EconomicSignals => ({
  transactionFrequency: 70, repaymentConsistency: 80, repeatCustomerRate: 50,
  incomeStability: 75, cashflowVolatility: 70, activityLevel: 85,
  savingsBehaviour: 70, contributionReliability: 75, groupParticipation: 55,
});

describe('LoanEligibilityEvaluator', () => {
  it('is ineligible when trust score is below 40', () => {
    const result = evaluator.evaluate(signals(), scores(35), 'High');
    expect(result.eligible).toBe(false);
    expect(result.eligibleAmount).toBe(0);
  });

  it('is ineligible for Very High risk regardless of trust score', () => {
    const result = evaluator.evaluate(signals(), scores(80), 'Very High');
    expect(result.eligible).toBe(false);
    expect(result.eligibleAmount).toBe(0);
  });

  it('calculates eligible amount correctly for Low risk', () => {
    const result = evaluator.evaluate(signals(), scores(70), 'Low');
    expect(result.eligible).toBe(true);
    // (70 - 40) * 5000 = 150,000 — below 500,000 cap
    expect(result.eligibleAmount).toBe(150_000);
    expect(result.recommendation).toContain('150,000');
  });

  it('caps amount at risk tier ceiling', () => {
    const result = evaluator.evaluate(signals(), scores(100), 'Medium');
    expect(result.eligibleAmount).toBe(200_000); // capped at Medium tier
  });

  it('eligible amount grows with trust score', () => {
    const low = evaluator.evaluate(signals(), scores(50), 'Low');
    const high = evaluator.evaluate(signals(), scores(80), 'Low');
    expect(high.eligibleAmount).toBeGreaterThan(low.eligibleAmount);
  });

  it('includes repayment confidence factors in reasons', () => {
    const result = evaluator.evaluate(signals(), scores(60), 'Medium');
    expect(result.reasons.length).toBeGreaterThan(0);
    expect(result.reasons.some((r) => r.toLowerCase().includes('repayment'))).toBe(true);
  });
});
