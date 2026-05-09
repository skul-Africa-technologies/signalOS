import { Injectable } from '@nestjs/common';
import { TrustReport, RiskLevel } from '../interfaces/intelligence.interfaces';

export interface TrustLevel {
  level: RiskLevel;
  band: string;         // human-readable band label
  eligible: boolean;    // eligible for any financial product
  nextMilestone: string; // what the user needs to improve
}

@Injectable()
export class TrustLevelEvaluator {
  evaluate(report: TrustReport): TrustLevel {
    const { trustScore, riskLevel } = report;

    return {
      level: riskLevel,
      band: this.toBand(trustScore),
      eligible: trustScore >= 30,
      nextMilestone: this.nextMilestone(trustScore),
    };
  }

  private toBand(score: number): string {
    if (score >= 80) return 'Platinum (80–100)';
    if (score >= 70) return 'Gold (70–79)';
    if (score >= 50) return 'Silver (50–69)';
    if (score >= 30) return 'Bronze (30–49)';
    return 'Unrated (0–29)';
  }

  private nextMilestone(score: number): string {
    if (score >= 80) return 'Maintain activity to retain Platinum status';
    if (score >= 70) return 'Reach 80 to unlock Platinum — increase savings consistency';
    if (score >= 50) return 'Reach 70 to unlock Gold — improve payment reliability';
    if (score >= 30) return 'Reach 50 to unlock Silver — increase transaction frequency';
    return 'Complete 3+ transactions to begin building your trust profile';
  }
}
