import { Injectable, Logger } from '@nestjs/common';
import { TransactionStatus } from '../../../common/prisma-enums';
import { Transaction } from '@prisma/client';

export interface VolatilityReport {
  hasSpike: boolean;           // single transaction >> normal range
  hasInactivityGap: boolean;   // gap > threshold between transactions
  longestGapDays: number;
  spikeMultiplier: number;     // how many times the spike exceeds the mean (1 = no spike)
  summary: string;
}

const SPIKE_MULTIPLIER_THRESHOLD = 3;   // amount > 3× mean = spike
const INACTIVITY_GAP_DAYS = 21;         // 21-day gap = inactivity

@Injectable()
export class VolatilityEvaluator {
  private readonly logger = new Logger(VolatilityEvaluator.name);

  evaluate(transactions: Transaction[]): VolatilityReport {
    const successful = transactions.filter((t) => t.status === TransactionStatus.SUCCESS);

    if (successful.length < 2) {
      return { hasSpike: false, hasInactivityGap: false, longestGapDays: 0, spikeMultiplier: 1, summary: 'Insufficient data' };
    }

    const amounts = successful.map((t) => t.amount);
    const mean = amounts.reduce((a, b) => a + b, 0) / amounts.length;
    const max = Math.max(...amounts);
    const spikeMultiplier = mean > 0 ? parseFloat((max / mean).toFixed(2)) : 1;
    const hasSpike = spikeMultiplier >= SPIKE_MULTIPLIER_THRESHOLD;

    const sorted = [...successful].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
    const gaps = sorted
      .slice(1)
      .map((t, i) => (new Date(t.createdAt).getTime() - new Date(sorted[i].createdAt).getTime()) / 86_400_000);
    const longestGapDays = parseFloat(Math.max(...gaps).toFixed(1));
    const hasInactivityGap = longestGapDays >= INACTIVITY_GAP_DAYS;

    const summary = this.buildSummary(hasSpike, hasInactivityGap, spikeMultiplier, longestGapDays);

    this.logger.debug(`Volatility: spike=${hasSpike} (${spikeMultiplier}×) gap=${longestGapDays}d`);

    return { hasSpike, hasInactivityGap, longestGapDays, spikeMultiplier, summary };
  }

  private buildSummary(hasSpike: boolean, hasGap: boolean, multiplier: number, gap: number): string {
    const parts: string[] = [];
    if (hasSpike) parts.push(`Unusual transaction spike detected (${multiplier}× average)`);
    if (hasGap) parts.push(`Inactivity gap of ${gap} days detected`);
    return parts.length > 0 ? parts.join('; ') : 'Transaction behaviour is stable';
  }
}
