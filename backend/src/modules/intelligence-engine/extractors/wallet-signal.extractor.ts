import { Injectable } from '@nestjs/common';
import { Wallet, LedgerEntry } from '@prisma/client';

export interface WalletSignals {
  walletActivityLevel: number;    
  balanceStability: number;      
  withdrawalBehaviour: number;    
  liquidityManagement: number;   
  repaymentBehaviour: number;    
}

@Injectable()
export class WalletSignalExtractor {
  extract(wallet: Wallet | null, ledgerEntries: LedgerEntry[]): WalletSignals {
    if (!wallet || ledgerEntries.length === 0) {
      return {
        walletActivityLevel: 0,
        balanceStability: 0,
        withdrawalBehaviour: 50,
        liquidityManagement: 0,
        repaymentBehaviour: 50,
      };
    }

    const credits = ledgerEntries.filter((e) => e.direction === 'CREDIT');
    const debits = ledgerEntries.filter((e) => e.direction === 'DEBIT');
    const withdrawals = ledgerEntries.filter((e) => e.category === 'WITHDRAWAL');
    const loanEntries = ledgerEntries.filter((e) => e.category === 'LOAN_DISBURSEMENT');

    // Activity: entries in last 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recentEntries = ledgerEntries.filter((e) => e.createdAt > thirtyDaysAgo);
    const walletActivityLevel = Math.min(100, (recentEntries.length / 10) * 100);

    
    const liquidityManagement =
      wallet.totalCredits > 0
        ? Math.min(100, (wallet.availableBalance / wallet.totalCredits) * 100)
        : 0;

    
    const balanceSnapshots = ledgerEntries.map((e) => e.balanceAfter);
    const balanceStability = this.computeStability(balanceSnapshots);

    
    const withdrawalRate = ledgerEntries.length > 0 ? withdrawals.length / ledgerEntries.length : 0;
    const withdrawalBehaviour = Math.max(0, 100 - withdrawalRate * 200);

   
    const repaymentBehaviour = loanEntries.length > 0 ? 70 : 50;

    return {
      walletActivityLevel: Math.round(walletActivityLevel),
      balanceStability: Math.round(balanceStability),
      withdrawalBehaviour: Math.round(withdrawalBehaviour),
      liquidityManagement: Math.round(liquidityManagement),
      repaymentBehaviour,
    };
  }

  private computeStability(values: number[]): number {
    if (values.length < 2) return 50;
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    if (mean === 0) return 0;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
    const cv = Math.sqrt(variance) / mean; // coefficient of variation
    return Math.max(0, Math.min(100, 100 - cv * 100));
  }
}
