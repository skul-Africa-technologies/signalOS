import { Injectable } from '@nestjs/common';
import { Transaction, TransactionStatus } from '@prisma/client';

export interface PaymentSignals {
  transactionFrequency: number;  // 0–100
  repaymentConsistency: number;  // 0–100
  repeatCustomerRate: number;    // 0–100
}

// Benchmark: 20 successful transactions = full frequency score
const FREQUENCY_BENCHMARK = 20;

@Injectable()
export class PaymentSignalExtractor {
  extract(transactions: Transaction[]): PaymentSignals {
    if (transactions.length === 0) {
      return { transactionFrequency: 0, repaymentConsistency: 0, repeatCustomerRate: 0 };
    }

    const successful = transactions.filter((t) => t.status === TransactionStatus.SUCCESS);

    return {
      transactionFrequency: this.frequency(successful.length),
      repaymentConsistency: this.consistency(successful.length, transactions.length),
      repeatCustomerRate: this.repeatRate(transactions),
    };
  }

  private frequency(successCount: number): number {
    return Math.min(100, Math.round((successCount / FREQUENCY_BENCHMARK) * 100));
  }

  private consistency(successCount: number, total: number): number {
    return Math.round((successCount / total) * 100);
  }

  private repeatRate(transactions: Transaction[]): number {
    // Proxy: proportion of transactions sharing a channel (repeat usage pattern)
    const channels = transactions.map((t) => t.channel).filter(Boolean) as string[];
    if (channels.length === 0) return 0;
    const channelCounts = channels.reduce<Record<string, number>>((acc, c) => {
      acc[c] = (acc[c] ?? 0) + 1;
      return acc;
    }, {});
    const repeated = Object.values(channelCounts).filter((n) => n > 1).reduce((a, b) => a + b, 0);
    return Math.round((repeated / channels.length) * 100);
  }
}
