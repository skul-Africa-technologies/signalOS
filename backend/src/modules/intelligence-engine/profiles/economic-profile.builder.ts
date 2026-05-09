import { Injectable } from '@nestjs/common';
import {
  EconomicSignals,
  IntelligenceScores,
  EconomicProfileRecord,
  RiskLevel,
} from '../interfaces/intelligence.interfaces';

@Injectable()
export class EconomicProfileBuilder {
  build(
    userId: string,
    signals: EconomicSignals,
    scores: IntelligenceScores,
    riskLevel: RiskLevel,
  ): EconomicProfileRecord {
    return {
      userId,
      trustScore: scores.trustScore,
      reliabilityScore: scores.reliabilityScore,
      liquidityScore: scores.liquidityScore,
      employabilityScore: scores.employabilityScore,
      consistencyScore: scores.consistencyScore,
      growthScore: scores.growthScore,
      participationScore: scores.participationScore,
      activityLevel: signals.activityLevel,
      riskLevel,
      updatedAt: new Date(),
    };
  }
}
