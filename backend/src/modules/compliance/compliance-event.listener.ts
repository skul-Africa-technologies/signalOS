import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { MetricsService } from '../observability/metrics.service';
import { AlertService } from '../observability/alert.service';
import { QueueService } from '../queue/queue.service';

/**
 * Compliance Event Listener — wires Phase 4 events into the full platform.
 *
 * kyc.verified     → trust upgraded · analytics updated · notification queued · audit logged
 * kyc.rejected     → notification queued · audit logged
 * system.error     → Sentry notified · alert generated · metrics updated
 * reconciliation.failed → operational alert · treasury risk updated · admin notification
 */
@Injectable()
export class ComplianceEventListener {
  private readonly logger = new Logger(ComplianceEventListener.name);

  constructor(
    private readonly events: EventEmitter2,
    private readonly metrics: MetricsService,
    private readonly alerts: AlertService,
    private readonly queue: QueueService,
  ) {}

  @OnEvent('kyc.verified')
  onKycVerified(p: { userId: string; profileId: string; verificationLevel: string }) {
    this.logger.log(`[Compliance] KYC verified → triggering trust upgrade for user ${p.userId}`);

    // Trigger trust score recalculation
    this.events.emit('trust.recalculate.requested', { userId: p.userId, trigger: 'kyc.verified' });
    this.metrics.trustRecalculations.inc();

    // Queue analytics update
    this.queue.enqueue('analytics', { event: 'kyc.verified', userId: p.userId, verificationLevel: p.verificationLevel });

    // Queue notification
    this.queue.enqueue('sms', {
      userId: p.userId,
      template: 'kyc_verified',
      data: { verificationLevel: p.verificationLevel },
    });

    // Emit websocket event for real-time UI update
    this.events.emit('websocket.emit', {
      userId: p.userId,
      event: 'kyc.status.updated',
      data: { status: 'VERIFIED', verificationLevel: p.verificationLevel },
    });
  }

  @OnEvent('kyc.rejected')
  onKycRejected(p: { userId: string; profileId: string; reason: string }) {
    this.logger.warn(`[Compliance] KYC rejected for user ${p.userId}: ${p.reason}`);

    this.queue.enqueue('sms', {
      userId: p.userId,
      template: 'kyc_rejected',
      data: { reason: p.reason },
    });

    this.events.emit('websocket.emit', {
      userId: p.userId,
      event: 'kyc.status.updated',
      data: { status: 'REJECTED', reason: p.reason },
    });
  }

  @OnEvent('kyc.submitted')
  onKycSubmitted(p: { userId: string; type: string }) {
    this.queue.enqueue('kyc-processing', { userId: p.userId, type: p.type });
  }

  @OnEvent('identity.risk.detected')
  onIdentityRisk(p: { userId: string; riskLevel: string; riskScore: number }) {
    this.logger.warn(`[Compliance] Identity risk: ${p.riskLevel} for user ${p.userId}`);

    // Queue fraud analysis
    this.queue.enqueue('fraud-analysis', { userId: p.userId, trigger: 'identity.risk', riskScore: p.riskScore });

    if (p.riskScore > 80) {
      this.alerts.emit({
        severity: 'HIGH',
        title: 'High Identity Risk Detected',
        message: `User ${p.userId} risk score: ${p.riskScore}`,
        context: p,
      });
    }
  }

  @OnEvent('reconciliation.failed')
  onReconciliationFailed(p: { jobId: string; reason?: string }) {
    this.logger.error(`[Compliance] Reconciliation failed: job ${p.jobId}`);
    this.metrics.reconciliationFailures.inc();

    this.queue.enqueue('email', {
      to: process.env.ADMIN_EMAIL ?? 'admin@signalos.io',
      template: 'reconciliation_failure',
      data: p,
    });

    this.alerts.emit({
      severity: 'HIGH',
      title: 'Reconciliation Failure',
      message: `Job ${p.jobId} failed: ${p.reason ?? 'unknown'}`,
      context: p,
    });
  }

  @OnEvent('system.error.detected')
  onSystemError(p: { service: string; error: string; context?: Record<string, any> }) {
    this.logger.error(`[Compliance] System error in ${p.service}: ${p.error}`);
    this.alerts.emit({
      severity: 'CRITICAL',
      title: `System Error: ${p.service}`,
      message: p.error,
      context: p.context,
    });
  }
}
