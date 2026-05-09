import { Injectable, Logger } from '@nestjs/common';
import { EconomicSignals, IntelligenceScores } from '../interfaces/intelligence.interfaces';
import { SIGNAL_WEIGHTS } from '../intelligence.constants';

@Injectable()
export class ScoreCalculator {
  private readonly logger = new Logger(ScoreCalculator.name);

  calculate(signals: EconomicSignals): IntelligenceScores {
    this.logger.debug('Calculating intelligence scores from signals');

    return {
      trustScore: this.computeWeightedScore(signals),
      reliabilityScore: Math.round((signals.repaymentConsistency + signals.contributionReliability) / 2),
      liquidityScore: signals.cashflowVolatility,
      employabilityScore: Math.round((signals.activityLevel + signals.incomeStability) / 2),
      growthScore: Math.round((signals.savingsBehaviour + signals.groupParticipation) / 2),
      consistencyScore: Math.round(
        (signals.repaymentConsistency + signals.contributionReliability + signals.incomeStability) / 3,
      ),
      participationScore: Math.round((signals.groupParticipation + signals.repeatCustomerRate) / 2),
    };
  }

  private computeWeightedScore(signals: EconomicSignals): number {
    const weighted =
      (signals.transactionFrequency * SIGNAL_WEIGHTS.TRANSACTION_FREQUENCY +
        signals.repaymentConsistency * SIGNAL_WEIGHTS.REPAYMENT_CONSISTENCY +
        signals.incomeStability * SIGNAL_WEIGHTS.INCOME_STABILITY +
        signals.savingsBehaviour * SIGNAL_WEIGHTS.SAVINGS_BEHAVIOUR +
        signals.repeatCustomerRate * SIGNAL_WEIGHTS.REPEAT_CUSTOMER_RATE) /
      100;

    return Math.min(100, Math.round(weighted));
  }
}
