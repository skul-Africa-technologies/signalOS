import { Injectable } from '@nestjs/common';
import { Contribution } from '@prisma/client';

export interface SavingsSignals {
  savingsBehaviour: number;       // 0–100: frequency of contributions
  contributionReliability: number; // 0–100: consistency of contribution amounts
}

// Benchmark: 5 contributions = full savings behaviour score
const CONTRIBUTION_BENCHMARK = 5;

@Injectable()
export class SavingsSignalExtractor {
  extract(contributions: Contribution[]): SavingsSignals {
    if (contributions.length === 0) {
      return { savingsBehaviour: 0, contributionReliability: 0 };
    }

    return {
      savingsBehaviour: this.behaviour(contributions.length),
      contributionReliability: this.reliability(contributions.map((c) => c.amount)),
    };
  }

  private behaviour(count: number): number {
    return Math.min(100, Math.round((count / CONTRIBUTION_BENCHMARK) * 100));
  }

  private reliability(amounts: number[]): number {
    if (amounts.length < 2) return amounts.length === 1 ? 50 : 0;
    const mean = amounts.reduce((a, b) => a + b, 0) / amounts.length;
    if (mean === 0) return 0;
    const variance = amounts.reduce((sum, a) => sum + Math.pow(a - mean, 2), 0) / amounts.length;
    const cv = Math.sqrt(variance) / mean; // coefficient of variation
    // cv=0 → 100 (perfectly consistent), cv≥1 → 0
    return Math.max(0, Math.round((1 - Math.min(cv, 1)) * 100));
  }
}
