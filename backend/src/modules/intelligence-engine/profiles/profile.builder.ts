import { Injectable, Logger } from '@nestjs/common';
import {
  BehaviouralProfile,
  EconomicSignals,
  IntelligenceScores,
  EligibilityFlags,
  RiskLevel,
} from '../interfaces/intelligence.interfaces';

@Injectable()
export class ProfileBuilder {
  private readonly logger = new Logger(ProfileBuilder.name);

  build(
    userId: string,
    signals: EconomicSignals,
    scores: IntelligenceScores,
    riskLevel: RiskLevel,
    eligibilityFlags: EligibilityFlags,
  ): BehaviouralProfile {
    this.logger.debug(`Building behavioural profile for user ${userId}`);

    return {
      userId,
      signals,
      scores,
      riskLevel,
      eligibilityFlags,
      computedAt: new Date(),
    };
  }
}
