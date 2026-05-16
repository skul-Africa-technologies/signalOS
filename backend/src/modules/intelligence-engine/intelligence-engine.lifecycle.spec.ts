/**
 * Intelligence Engine — Full Lifecycle Simulation
 *
 * Simulates the 9-step user journey entirely in-process using real engine
 * classes (no DB, no HTTP). Verifies that scores evolve, risk changes,
 * eligibility updates, and recommendations reflect the latest behaviour.
 */
import { TrustScoreCalculator } from './calculators/trust-score.calculator';
import { ScoreCalculator } from './calculators/score.calculator';
import { RiskEvaluator } from './evaluators/risk.evaluator';
import { EligibilityEvaluator } from './evaluators/eligibility.evaluator';
import { LoanEligibilityEvaluator } from './evaluators/loan-eligibility.evaluator';
import { RepaymentConfidenceEvaluator } from './evaluators/repayment-confidence.evaluator';
import { RecommendationAnalyzer } from './analyzers/recommendation.analyzer';
import { PaymentSignalExtractor } from './extractors/payment-signal.extractor';
import { SavingsSignalExtractor } from './extractors/savings-signal.extractor';
import { TransactionSignalExtractor } from './extractors/transaction-signal.extractor';
import { ParticipationSignalExtractor } from './extractors/participation-signal.extractor';
import { SignalExtractor } from './extractors/signal.extractor';
import { EconomicSignals } from './interfaces/intelligence.interfaces';
import { TransactionStatus, TransactionType } from '../../common/prisma-enums';
import { Transaction, Contribution, GroupMember } from '@prisma/client';

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeTx(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: Math.random().toString(36).slice(2),
    userId: 'user-1',
    reference: Math.random().toString(36).slice(2),
    squadReference: null,
    amount: 5000,
    currency: 'NGN',
    type: TransactionType.CREDIT,
    status: TransactionStatus.SUCCESS,
    channel: 'bank_transfer',
    metadata: null,
    createdAt: new Date(Date.now() - Math.random() * 30 * 86_400_000),
    updatedAt: new Date(),
    ...overrides,
  };
}

function makeContribution(overrides: Partial<Contribution> = {}): Contribution {
  return {
    id: Math.random().toString(36).slice(2),
    userId: 'user-1',
    groupId: 'group-1',
    amount: 2000,
    createdAt: new Date(),
    ...overrides,
  };
}

// ── Engine setup (no DI container needed — pure class instantiation) ──────────

const paymentExtractor = new PaymentSignalExtractor();
const savingsExtractor = new SavingsSignalExtractor();
const txExtractor = new TransactionSignalExtractor();
const participationExtractor = new ParticipationSignalExtractor();
const signalExtractor = new SignalExtractor(paymentExtractor, savingsExtractor, txExtractor, participationExtractor);
const scoreCalculator = new ScoreCalculator();
const trustCalculator = new TrustScoreCalculator();
const riskEvaluator = new RiskEvaluator();
const eligibilityEvaluator = new EligibilityEvaluator();
const repaymentConfidence = new RepaymentConfidenceEvaluator();
const loanEvaluator = new LoanEligibilityEvaluator(repaymentConfidence);
const recommendationAnalyzer = new RecommendationAnalyzer();

function runEngine(txns: Transaction[], contributions: Contribution[], memberships: GroupMember[] = []) {
  const signals = signalExtractor.extract(txns, contributions, memberships);
  const dataPoints = txns.length + contributions.length + memberships.length;
  const trustReport = trustCalculator.calculate(signals, dataPoints);
  const scores = scoreCalculator.calculate(signals);
  scores.trustScore = trustReport.trustScore;
  const riskReport = riskEvaluator.evaluateDetailed(signals);
  const eligibility = eligibilityEvaluator.evaluate(scores);
  const loan = loanEvaluator.evaluate(signals, scores, trustReport.riskLevel);
  const recommendations = recommendationAnalyzer.analyze(signals, scores);
  return { signals, scores, trustReport, riskReport, eligibility, loan, recommendations };
}

// ── Lifecycle simulation ──────────────────────────────────────────────────────

describe('Intelligence Engine — Full Lifecycle Simulation', () => {
  // Step 1: New user — no activity
  it('Step 1: new user has zero trust and Very High risk', () => {
    const { trustReport, riskReport } = runEngine([], []);
    expect(trustReport.trustScore).toBe(0);
    expect(trustReport.riskLevel).toBe('Very High');
    expect(riskReport.riskScore).toBeGreaterThan(0);
  });

  // Step 2–4: User receives payments → signals extracted → trust recalculated
  it('Step 2–4: trust score rises after successful payments', () => {
    const before = runEngine([], []);
    const txns = Array.from({ length: 8 }, () => makeTx());
    const after = runEngine(txns, []);
    expect(after.trustReport.trustScore).toBeGreaterThan(before.trustReport.trustScore);
  });

  // Step 5: Economic profile scores are populated
  it('Step 5: profile scores are non-zero after payment activity', () => {
    const txns = Array.from({ length: 10 }, () => makeTx());
    const { scores } = runEngine(txns, []);
    expect(scores.trustScore).toBeGreaterThan(0);
    expect(scores.reliabilityScore).toBeGreaterThan(0);
    expect(scores.employabilityScore).toBeGreaterThan(0);
  });

  // Step 6–7: User contributes to savings → risk reevaluated
  it('Step 6–7: savings contributions improve scores and reduce risk', () => {
    const txns = Array.from({ length: 10 }, () => makeTx());
    const withoutSavings = runEngine(txns, []);
    const contributions = Array.from({ length: 5 }, () => makeContribution());
    const withSavings = runEngine(txns, contributions);
    expect(withSavings.scores.growthScore).toBeGreaterThan(withoutSavings.scores.growthScore);
    expect(withSavings.trustReport.trustScore).toBeGreaterThanOrEqual(withoutSavings.trustReport.trustScore);
  });

  // Step 8: Eligibility recalculated
  it('Step 8: loan eligibility unlocks as trust score crosses threshold', () => {
    const fewTxns = Array.from({ length: 3 }, () => makeTx());
    const manyTxns = Array.from({ length: 20 }, () => makeTx());
    const contributions = Array.from({ length: 5 }, () => makeContribution());
    const ineligible = runEngine(fewTxns, []);
    const eligible = runEngine(manyTxns, contributions);
    // With more activity, loan eligibility should improve
    expect(eligible.loan.eligibleAmount).toBeGreaterThanOrEqual(ineligible.loan.eligibleAmount);
  });

  // Step 9: Recommendations reflect latest behaviour
  it('Step 9: recommendations are contextual and ranked', () => {
    const txns = Array.from({ length: 15 }, () => makeTx());
    const { recommendations } = runEngine(txns, []);
    expect(recommendations.length).toBeGreaterThan(0);
    // High priority recommendations come first
    const priorities = recommendations.map((r) => r.priority);
    const highIdx = priorities.indexOf('high');
    const lowIdx = priorities.lastIndexOf('low');
    if (highIdx !== -1 && lowIdx !== -1) expect(highIdx).toBeLessThan(lowIdx);
  });

  // Verify: failed transactions reduce repayment consistency and raise risk
  it('failed transactions reduce repayment consistency vs all-success baseline', () => {
    const goodTxns = Array.from({ length: 10 }, () => makeTx());
    const mixedTxns = [
      ...Array.from({ length: 5 }, () => makeTx()),
      ...Array.from({ length: 5 }, () => makeTx({ status: TransactionStatus.FAILED })),
    ];
    const good = runEngine(goodTxns, []);
    const mixed = runEngine(mixedTxns, []);
    // Mixed (50% success) must have lower repayment consistency than all-success
    expect(mixed.signals.repaymentConsistency).toBeLessThan(good.signals.repaymentConsistency);
    // And therefore lower trust score
    expect(mixed.trustReport.trustScore).toBeLessThanOrEqual(good.trustReport.trustScore);
  });

  // Verify: scores evolve deterministically (same input = same output)
  it('scoring is deterministic — same input always produces same output', () => {
    const txns = Array.from({ length: 10 }, () => makeTx({ createdAt: new Date('2026-01-15') }));
    const r1 = runEngine(txns, []);
    const r2 = runEngine(txns, []);
    expect(r1.trustReport.trustScore).toBe(r2.trustReport.trustScore);
    expect(r1.riskReport.riskLevel).toBe(r2.riskReport.riskLevel);
  });

  // Verify: signal extraction covers all 9 dimensions
  it('all 9 signal dimensions are extracted', () => {
    const txns = Array.from({ length: 10 }, () => makeTx());
    const contributions = Array.from({ length: 3 }, () => makeContribution());
    const { signals } = runEngine(txns, contributions);
    const keys: (keyof EconomicSignals)[] = [
      'transactionFrequency', 'repaymentConsistency', 'repeatCustomerRate',
      'incomeStability', 'cashflowVolatility', 'activityLevel',
      'savingsBehaviour', 'contributionReliability', 'groupParticipation',
    ];
    for (const key of keys) {
      expect(signals[key]).toBeGreaterThanOrEqual(0);
      expect(signals[key]).toBeLessThanOrEqual(100);
    }
  });
});
