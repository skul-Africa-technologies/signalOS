import { Injectable, Logger } from '@nestjs/common';
import { IntelligenceScores, EligibilityFlags } from '../interfaces/intelligence.interfaces';
import { ELIGIBILITY_THRESHOLDS } from '../intelligence.constants';

@Injectable()
export class EligibilityEvaluator {
  private readonly logger = new Logger(EligibilityEvaluator.name);

  evaluate(scores: IntelligenceScores): EligibilityFlags {
    this.logger.debug('Evaluating eligibility flags from scores');

    return {
      loanEligible: scores.trustScore >= ELIGIBILITY_THRESHOLDS.LOAN_MIN_TRUST_SCORE,
      savingsEligible: scores.trustScore >= ELIGIBILITY_THRESHOLDS.SAVINGS_MIN_TRUST_SCORE,
      opportunityEligible: scores.employabilityScore >= ELIGIBILITY_THRESHOLDS.OPPORTUNITY_MIN_EMPLOYABILITY_SCORE,
    };
  }
}
