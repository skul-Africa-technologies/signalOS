import { Injectable } from '@nestjs/common';
import { GroupEconomicProfile } from '@prisma/client';

export interface TreasurySignals {
  treasuryGrowthRate: number;      // 0–100
  memberReliability: number;       // 0–100
  liquidityPressure: number;       // 0–100 (higher = more pressure)
  contributionMomentum: number;    // 0–100
  repaymentHealth: number;         // 0–100
  reserveSustainability: number;   // 0–100
}

@Injectable()
export class TreasurySignalExtractor {
  extract(profile: GroupEconomicProfile | null): TreasurySignals {
    if (!profile) {
      return { treasuryGrowthRate: 0, memberReliability: 50, liquidityPressure: 50, contributionMomentum: 0, repaymentHealth: 50, reserveSustainability: 0 };
    }
    return {
      treasuryGrowthRate: Math.min(100, profile.contributionConsistency),
      memberReliability: profile.groupReliability,
      liquidityPressure: Math.max(0, 100 - profile.liquidityStability),
      contributionMomentum: profile.memberParticipation,
      repaymentHealth: profile.repaymentPerformance,
      reserveSustainability: profile.reserveRatio * 100,
    };
  }
}
