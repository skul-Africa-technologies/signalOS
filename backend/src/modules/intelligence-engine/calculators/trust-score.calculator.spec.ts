import { TrustScoreCalculator } from '../calculators/trust-score.calculator';
import { EconomicSignals } from '../interfaces/intelligence.interfaces';

const calculator = new TrustScoreCalculator();

const emptySignals = (): EconomicSignals => ({
  transactionFrequency: 0, repaymentConsistency: 0, repeatCustomerRate: 0,
  incomeStability: 0, cashflowVolatility: 0, activityLevel: 0,
  savingsBehaviour: 0, contributionReliability: 0, groupParticipation: 0,
});

const strongSignals = (): EconomicSignals => ({
  transactionFrequency: 80, repaymentConsistency: 90, repeatCustomerRate: 70,
  incomeStability: 75, cashflowVolatility: 80, activityLevel: 95,
  savingsBehaviour: 85, contributionReliability: 80, groupParticipation: 60,
});

describe('TrustScoreCalculator', () => {
  it('returns zero trust and Very High risk when data is insufficient', () => {
    const report = calculator.calculate(emptySignals(), 1);
    expect(report.trustScore).toBe(0);
    expect(report.riskLevel).toBe('Very High');
    expect(report.confidence).toBe('Low');
    expect(report.reasons).toContain('Insufficient transaction history to generate trust score');
  });

  it('produces a high trust score from strong signals', () => {
    const report = calculator.calculate(strongSignals(), 25);
    expect(report.trustScore).toBeGreaterThanOrEqual(70);
    expect(report.riskLevel).toBe('Low');
    expect(report.confidence).toBe('High');
    expect(report.reasons.length).toBeGreaterThan(0);
    expect(report.factorBreakdown).toHaveProperty('repaymentConsistency');
  });

  it('trust score increases as signals improve', () => {
    const weak: EconomicSignals = { ...emptySignals(), repaymentConsistency: 30, transactionFrequency: 20 };
    const strong: EconomicSignals = { ...emptySignals(), repaymentConsistency: 90, transactionFrequency: 80 };
    const weakReport = calculator.calculate(weak, 5);
    const strongReport = calculator.calculate(strong, 5);
    expect(strongReport.trustScore).toBeGreaterThan(weakReport.trustScore);
  });

  it('caps trust score at 100', () => {
    const maxSignals: EconomicSignals = {
      transactionFrequency: 100, repaymentConsistency: 100, repeatCustomerRate: 100,
      incomeStability: 100, cashflowVolatility: 100, activityLevel: 100,
      savingsBehaviour: 100, contributionReliability: 100, groupParticipation: 100,
    };
    const report = calculator.calculate(maxSignals, 50);
    expect(report.trustScore).toBeLessThanOrEqual(100);
  });

  it('maps confidence correctly by data point count', () => {
    const s = strongSignals();
    expect(calculator.calculate(s, 4).confidence).toBe('Low');
    expect(calculator.calculate(s, 10).confidence).toBe('Medium');
    expect(calculator.calculate(s, 25).confidence).toBe('High');
  });
});
