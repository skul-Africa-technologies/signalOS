import { RiskEvaluator } from '../evaluators/risk.evaluator';
import { EconomicSignals } from '../interfaces/intelligence.interfaces';

const evaluator = new RiskEvaluator();

const signals = (overrides: Partial<EconomicSignals> = {}): EconomicSignals => ({
  transactionFrequency: 70, repaymentConsistency: 75, repeatCustomerRate: 50,
  incomeStability: 70, cashflowVolatility: 70, activityLevel: 80,
  savingsBehaviour: 60, contributionReliability: 65, groupParticipation: 50,
  ...overrides,
});

describe('RiskEvaluator', () => {
  it('returns Low risk for healthy signals', () => {
    const report = evaluator.evaluateDetailed(signals());
    expect(report.riskLevel).toBe('Low');
    expect(report.riskScore).toBeLessThanOrEqual(10);
    expect(report.flags).toContain('No significant risk factors detected');
  });

  it('detects inactivity and raises risk', () => {
    const report = evaluator.evaluateDetailed(signals({ activityLevel: 10 }));
    expect(report.inactivityDetected).toBe(true);
    expect(report.flags).toContain('Prolonged inactivity detected');
    expect(report.riskScore).toBeGreaterThan(10);
  });

  it('detects declining payments and raises risk', () => {
    const report = evaluator.evaluateDetailed(signals({ repaymentConsistency: 20 }));
    expect(report.flags).toContain('Declining payment activity');
    expect(report.riskScore).toBeGreaterThan(10); // at least Medium
  });

  it('detects cashflow volatility', () => {
    const report = evaluator.evaluateDetailed(signals({ cashflowVolatility: 15 }));
    expect(report.volatilityDetected).toBe(true);
    expect(report.flags).toContain('High cashflow volatility');
  });

  it('accumulates multiple risk flags', () => {
    const report = evaluator.evaluateDetailed(signals({
      activityLevel: 5, repaymentConsistency: 15, incomeStability: 10,
    }));
    expect(report.flags.length).toBeGreaterThanOrEqual(3);
    expect(report.riskLevel).toBe('Very High');
  });

  it('risk score is bounded 0–100', () => {
    const worst = signals({ activityLevel: 0, repaymentConsistency: 0, incomeStability: 0, cashflowVolatility: 0, savingsBehaviour: 0, groupParticipation: 0 });
    const report = evaluator.evaluateDetailed(worst);
    expect(report.riskScore).toBeGreaterThanOrEqual(0);
    expect(report.riskScore).toBeLessThanOrEqual(100);
  });
});
