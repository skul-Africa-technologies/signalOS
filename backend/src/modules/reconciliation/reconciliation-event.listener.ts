import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { RECONCILIATION_EVENTS } from './reconciliation.service';

@Injectable()
export class ReconciliationEventListener {
  private readonly logger = new Logger(ReconciliationEventListener.name);

  @OnEvent(RECONCILIATION_EVENTS.MISMATCH_DETECTED)
  onMismatchDetected(payload: { jobId: string; reference: string; type: string; mismatchId: string }) {
    this.logger.warn(
      `[RECON] Mismatch detected: job=${payload.jobId} ref=${payload.reference} type=${payload.type}`,
    );
  }

  @OnEvent(RECONCILIATION_EVENTS.JOB_COMPLETED)
  onJobCompleted(payload: { jobId: string; mismatchesFound: number; provider: string }) {
    if (payload.mismatchesFound > 0) {
      this.logger.warn(
        `[RECON] Job ${payload.jobId} (${payload.provider}) completed with ${payload.mismatchesFound} mismatches`,
      );
    } else {
      this.logger.log(`[RECON] Job ${payload.jobId} (${payload.provider}) — clean reconciliation`);
    }
  }

  @OnEvent(RECONCILIATION_EVENTS.LEDGER_INCONSISTENCY)
  onLedgerInconsistency(payload: { walletId: string; userId: string; delta: number }) {
    this.logger.error(
      `[RECON] Ledger inconsistency: wallet=${payload.walletId} user=${payload.userId} delta=${payload.delta.toFixed(2)}`,
    );
  }
}
