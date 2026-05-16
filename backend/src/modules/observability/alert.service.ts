import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { SentryService } from './sentry.service';
import { MetricsService } from './metrics.service';

export type AlertSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface Alert {
  severity: AlertSeverity;
  title: string;
  message: string;
  context?: Record<string, any>;
}

@Injectable()
export class AlertService {
  private readonly logger = new Logger(AlertService.name);

  constructor(
    private readonly sentry: SentryService,
    private readonly metrics: MetricsService,
  ) {}

  emit(alert: Alert) {
    const logFn = alert.severity === 'CRITICAL' || alert.severity === 'HIGH'
      ? this.logger.error.bind(this.logger)
      : this.logger.warn.bind(this.logger);

    logFn(`[${alert.severity}] ${alert.title}: ${alert.message}`, JSON.stringify(alert.context));

    if (alert.severity === 'HIGH' || alert.severity === 'CRITICAL') {
      this.sentry.captureMessage(
        `[${alert.severity}] ${alert.title}: ${alert.message}`,
        alert.severity === 'CRITICAL' ? 'fatal' : 'error',
        alert.context,
      );
    }
  }

  @OnEvent('reconciliation.failed')
  onReconciliationFailed(p: { jobId: string; reason?: string }) {
    this.metrics.reconciliationFailures.inc();
    this.emit({ severity: 'HIGH', title: 'Reconciliation Failed', message: `Job ${p.jobId} failed`, context: p });
  }

  @OnEvent('fraud.detected')
  onFraudDetected(p: { userId: string; riskLevel: string }) {
    this.metrics.fraudDetections.labels(p.riskLevel).inc();
    if (p.riskLevel === 'CRITICAL') {
      this.emit({ severity: 'CRITICAL', title: 'Critical Fraud Detected', message: `User ${p.userId}`, context: p });
    }
  }

  @OnEvent('identity.risk.detected')
  onIdentityRisk(p: { userId: string; riskLevel: string; riskScore: number }) {
    if (p.riskScore > 80) {
      this.emit({ severity: 'HIGH', title: 'High Identity Risk', message: `User ${p.userId} risk score: ${p.riskScore}`, context: p });
    }
  }

  @OnEvent('kyc.verified')
  onKycVerified() {
    this.metrics.kycVerifications.labels('VERIFIED').inc();
  }

  @OnEvent('kyc.rejected')
  onKycRejected() {
    this.metrics.kycVerifications.labels('REJECTED').inc();
  }

  @OnEvent('kyc.submitted')
  onKycSubmitted(p: { type: string }) {
    this.metrics.kycSubmissions.labels(p.type).inc();
  }
}
