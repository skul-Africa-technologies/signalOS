import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { MismatchStatus, MismatchType, ReconciliationJobStatus, PayoutStatus, LedgerEntryType } from '../../common/prisma-enums';
import {  } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export const RECONCILIATION_EVENTS = {
  MISMATCH_DETECTED: 'reconciliation.mismatch.detected',
  JOB_COMPLETED: 'reconciliation.job.completed',
  LEDGER_INCONSISTENCY: 'reconciliation.ledger.inconsistency',
} as const;

@Injectable()
export class ReconciliationService {
  private readonly logger = new Logger(ReconciliationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventEmitter2,
  ) {}

  // ─── Provider Reconciliation ────────────────────────────────────────────────

  async runProviderReconciliation(provider = 'squad') {
    const job = await this.prisma.reconciliationJob.create({
      data: { provider, status: ReconciliationJobStatus.RUNNING },
    });
    this.logger.log(`[RECON] Job started: ${job.id} provider=${provider}`);

    let mismatchesFound = 0;
    try {
      // Compare internal payout records against expected provider state
      const failedPayouts = await this.prisma.payout.findMany({
        where: { status: PayoutStatus.FAILED, createdAt: { gte: new Date(Date.now() - 86400000 * 7) } },
      });

      for (const payout of failedPayouts) {
        // Check if a corresponding ledger debit was incorrectly applied
        const debitEntry = await this.prisma.ledgerEntry.findFirst({
          where: { reference: payout.reference, type: LedgerEntryType.DEBIT },
        });
        if (debitEntry) {
          await this._recordMismatch(job.id, payout.reference, MismatchType.STATUS_MISMATCH, {
            internal: `DEBIT applied (${debitEntry.amount})`,
            external: `Payout FAILED — no disbursement`,
          });
          mismatchesFound++;
        }
      }

      // Detect duplicate references in ledger
      const duplicates = await this.prisma.$queryRaw<{ reference: string; cnt: bigint }[]>`
        SELECT reference, COUNT(*) as cnt
        FROM ledger_entries
        GROUP BY reference
        HAVING COUNT(*) > 1
      `;
      for (const dup of duplicates) {
        await this._recordMismatch(job.id, dup.reference, MismatchType.DUPLICATE_TRANSACTION, {
          internal: `${dup.cnt} entries with same reference`,
          external: 'Expected 1',
        });
        mismatchesFound++;
      }

      await this.prisma.reconciliationJob.update({
        where: { id: job.id },
        data: { status: ReconciliationJobStatus.COMPLETED, completedAt: new Date(), mismatchesFound },
      });

      this.events.emit(RECONCILIATION_EVENTS.JOB_COMPLETED, { jobId: job.id, mismatchesFound, provider });
      this.logger.log(`[RECON] Job completed: ${job.id} mismatches=${mismatchesFound}`);
    } catch (err: any) {
      await this.prisma.reconciliationJob.update({
        where: { id: job.id },
        data: { status: ReconciliationJobStatus.FAILED, completedAt: new Date() },
      });
      this.logger.error(`[RECON] Job failed: ${job.id} — ${err.message}`);
    }

    return { jobId: job.id, mismatchesFound };
  }

  // ─── Ledger Integrity Scan ──────────────────────────────────────────────────

  async runLedgerIntegrityScan() {
    const job = await this.prisma.reconciliationJob.create({
      data: { provider: 'internal-ledger', status: ReconciliationJobStatus.RUNNING },
    });
    this.logger.log(`[RECON] Ledger integrity scan started: ${job.id}`);

    let mismatchesFound = 0;
    try {
      const wallets = await this.prisma.wallet.findMany({
        include: { ledgerEntries: true },
      });

      for (const wallet of wallets) {
        const credits = wallet.ledgerEntries
          .filter((e) => e.type === LedgerEntryType.CREDIT)
          .reduce((s, e) => s + e.amount, 0);
        const debits = wallet.ledgerEntries
          .filter((e) => e.type !== LedgerEntryType.CREDIT)
          .reduce((s, e) => s + e.amount, 0);

        const expectedBalance = credits - debits;
        const actualBalance = wallet.availableBalance + wallet.frozenBalance;
        const delta = Math.abs(expectedBalance - actualBalance);

        if (delta > 0.01) {
          await this._recordMismatch(job.id, `wallet:${wallet.id}`, MismatchType.LEDGER_INCONSISTENCY, {
            internal: `Ledger computed: ${expectedBalance.toFixed(2)}`,
            external: `Wallet balance: ${actualBalance.toFixed(2)} (delta: ${delta.toFixed(2)})`,
          });
          mismatchesFound++;
          this.events.emit(RECONCILIATION_EVENTS.LEDGER_INCONSISTENCY, {
            walletId: wallet.id,
            userId: wallet.userId,
            delta,
          });
        }
      }

      await this.prisma.reconciliationJob.update({
        where: { id: job.id },
        data: { status: ReconciliationJobStatus.COMPLETED, completedAt: new Date(), mismatchesFound },
      });

      this.logger.log(`[RECON] Ledger scan complete: ${job.id} inconsistencies=${mismatchesFound}`);
    } catch (err: any) {
      await this.prisma.reconciliationJob.update({
        where: { id: job.id },
        data: { status: ReconciliationJobStatus.FAILED, completedAt: new Date() },
      });
      this.logger.error(`[RECON] Ledger scan failed: ${err.message}`);
    }

    return { jobId: job.id, mismatchesFound };
  }

  // ─── Treasury Consistency Check ─────────────────────────────────────────────

  async runTreasuryConsistencyCheck() {
    const job = await this.prisma.reconciliationJob.create({
      data: { provider: 'treasury', status: ReconciliationJobStatus.RUNNING },
    });

    let mismatchesFound = 0;
    try {
      const groupWallets = await this.prisma.savingsGroupWallet.findMany({
        include: { ledgerEntries: true },
      });

      for (const gw of groupWallets) {
        const credits = gw.ledgerEntries
          .filter((e) => e.type === LedgerEntryType.CREDIT)
          .reduce((s, e) => s + e.amount, 0);
        const debits = gw.ledgerEntries
          .filter((e) => e.type !== LedgerEntryType.CREDIT)
          .reduce((s, e) => s + e.amount, 0);

        const computed = credits - debits;
        const stored = gw.availableBalance + gw.reserveBalance + gw.lendingPoolBalance;
        const delta = Math.abs(computed - stored);

        if (delta > 0.01) {
          await this._recordMismatch(job.id, `group-wallet:${gw.id}`, MismatchType.LEDGER_INCONSISTENCY, {
            internal: `Ledger computed: ${computed.toFixed(2)}`,
            external: `Stored balance: ${stored.toFixed(2)} (delta: ${delta.toFixed(2)})`,
          });
          mismatchesFound++;
        }
      }

      await this.prisma.reconciliationJob.update({
        where: { id: job.id },
        data: { status: ReconciliationJobStatus.COMPLETED, completedAt: new Date(), mismatchesFound },
      });
    } catch (err: any) {
      await this.prisma.reconciliationJob.update({
        where: { id: job.id },
        data: { status: ReconciliationJobStatus.FAILED, completedAt: new Date() },
      });
    }

    return { jobId: job.id, mismatchesFound };
  }

  // ─── Resolution ─────────────────────────────────────────────────────────────

  async resolveMismatch(mismatchId: string, notes: string, adminId: string) {
    const mismatch = await this.prisma.reconciliationMismatch.findUnique({ where: { id: mismatchId } });
    if (!mismatch) throw new NotFoundException('Mismatch not found');

    const updated = await this.prisma.reconciliationMismatch.update({
      where: { id: mismatchId },
      data: { status: MismatchStatus.RESOLVED, resolutionNotes: `[${adminId}] ${notes}` },
    });

    // Increment resolved count on parent job
    await this.prisma.reconciliationJob.update({
      where: { id: mismatch.reconciliationJobId },
      data: { resolvedCount: { increment: 1 } },
    });

    return updated;
  }

  async escalateMismatch(mismatchId: string) {
    const mismatch = await this.prisma.reconciliationMismatch.findUnique({ where: { id: mismatchId } });
    if (!mismatch) throw new NotFoundException('Mismatch not found');
    return this.prisma.reconciliationMismatch.update({
      where: { id: mismatchId },
      data: { status: MismatchStatus.ESCALATED },
    });
  }

  // ─── Query ──────────────────────────────────────────────────────────────────

  async getJobs(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [jobs, total] = await Promise.all([
      this.prisma.reconciliationJob.findMany({
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: { _count: { select: { mismatches: true } } },
      }),
      this.prisma.reconciliationJob.count(),
    ]);
    return { jobs, total, page, limit };
  }

  async getMismatches(jobId: string, status?: MismatchStatus) {
    return this.prisma.reconciliationMismatch.findMany({
      where: { reconciliationJobId: jobId, ...(status && { status }) },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getOpenMismatches(page = 1, limit = 50) {
    const skip = (page - 1) * limit;
    const [mismatches, total] = await Promise.all([
      this.prisma.reconciliationMismatch.findMany({
        where: { status: MismatchStatus.OPEN },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: { job: { select: { provider: true, createdAt: true } } },
      }),
      this.prisma.reconciliationMismatch.count({ where: { status: MismatchStatus.OPEN } }),
    ]);
    return { mismatches, total, page, limit };
  }

  // ─── Scheduled Jobs ─────────────────────────────────────────────────────────

  @Cron('0 1 * * *', { name: 'daily-provider-reconciliation' })
  async scheduledProviderReconciliation() {
    this.logger.log('[CRON] Daily provider reconciliation starting');
    try {
      await this.runProviderReconciliation('squad');
    } catch (err: any) {
      this.logger.error(`[CRON] Provider reconciliation failed: ${err.message}`);
    }
  }

  @Cron('0 5 * * *', { name: 'daily-ledger-integrity' })
  async scheduledLedgerIntegrity() {
    this.logger.log('[CRON] Daily ledger integrity scan starting');
    try {
      await this.runLedgerIntegrityScan();
    } catch (err: any) {
      this.logger.error(`[CRON] Ledger integrity scan failed: ${err.message}`);
    }
  }

  @Cron('0 6 * * 0', { name: 'weekly-treasury-consistency' })
  async scheduledTreasuryConsistency() {
    this.logger.log('[CRON] Weekly treasury consistency check starting');
    try {
      await this.runTreasuryConsistencyCheck();
    } catch (err: any) {
      this.logger.error(`[CRON] Treasury consistency check failed: ${err.message}`);
    }
  }

  // ─── Private ────────────────────────────────────────────────────────────────

  private async _recordMismatch(
    jobId: string,
    reference: string,
    type: MismatchType,
    values: { internal: string; external: string },
  ) {
    const mismatch = await this.prisma.reconciliationMismatch.create({
      data: {
        reconciliationJobId: jobId,
        reference,
        mismatchType: type,
        internalValue: values.internal,
        externalValue: values.external,
        status: MismatchStatus.OPEN,
      },
    });
    this.events.emit(RECONCILIATION_EVENTS.MISMATCH_DETECTED, {
      jobId,
      reference,
      type,
      mismatchId: mismatch.id,
    });
    return mismatch;
  }
}
