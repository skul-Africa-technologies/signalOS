import { Injectable } from '@nestjs/common';
import { TransactionStatus, TransactionType } from '../../../common/prisma-enums';
import { Transaction } from '@prisma/client';

export interface TransactionSignals {
  incomeStability: number;    // 0–100: regularity of inbound credits
  cashflowVolatility: number; // 0–100: stability of amounts (higher = more stable)
  activityLevel: number;      // 0–100: recency of last transaction
}

// Full activity score if transacted within this many days
const ACTIVITY_WINDOW_DAYS = 90;

@Injectable()
export class TransactionSignalExtractor {
  extract(transactions: Transaction[]): TransactionSignals {
    if (transactions.length === 0) {
      return { incomeStability: 0, cashflowVolatility: 0, activityLevel: 0 };
    }

    const credits = transactions.filter(
      (t) => t.type === TransactionType.CREDIT && t.status === TransactionStatus.SUCCESS,
    );

    return {
      incomeStability: this.incomeStability(credits),
      cashflowVolatility: this.cashflowStability(transactions),
      activityLevel: this.activityLevel(transactions),
    };
  }

  private incomeStability(credits: Transaction[]): number {
    if (credits.length < 2) return credits.length === 1 ? 30 : 0;
    // Measure regularity via inter-arrival time variance
    const dates = credits.map((t) => new Date(t.createdAt).getTime()).sort((a, b) => a - b);
    const gaps = dates.slice(1).map((d, i) => d - dates[i]);
    const meanGap = gaps.reduce((a, b) => a + b, 0) / gaps.length;
    if (meanGap === 0) return 100;
    const variance = gaps.reduce((sum, g) => sum + Math.pow(g - meanGap, 2), 0) / gaps.length;
    const cv = Math.sqrt(variance) / meanGap;
    return Math.max(0, Math.round((1 - Math.min(cv, 1)) * 100));
  }

  private cashflowStability(transactions: Transaction[]): number {
    const amounts = transactions
      .filter((t) => t.status === TransactionStatus.SUCCESS)
      .map((t) => t.amount);
    if (amounts.length < 2) return amounts.length === 1 ? 50 : 0;
    const mean = amounts.reduce((a, b) => a + b, 0) / amounts.length;
    if (mean === 0) return 0;
    const variance = amounts.reduce((sum, a) => sum + Math.pow(a - mean, 2), 0) / amounts.length;
    const cv = Math.sqrt(variance) / mean;
    return Math.max(0, Math.round((1 - Math.min(cv, 1)) * 100));
  }

  private activityLevel(transactions: Transaction[]): number {
    const sorted = [...transactions].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
    const daysSinceLast = (Date.now() - new Date(sorted[0].createdAt).getTime()) / 86_400_000;
    return Math.max(0, Math.round((1 - daysSinceLast / ACTIVITY_WINDOW_DAYS) * 100));
  }
}
