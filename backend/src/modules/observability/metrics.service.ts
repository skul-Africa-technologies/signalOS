import { Injectable, OnModuleInit } from '@nestjs/common';
import { Counter, Histogram, Gauge, Registry, collectDefaultMetrics } from 'prom-client';

@Injectable()
export class MetricsService implements OnModuleInit {
  readonly registry = new Registry();

  readonly httpRequestDuration = new Histogram({
    name: 'http_request_duration_seconds',
    help: 'HTTP request duration in seconds',
    labelNames: ['method', 'route', 'status_code'],
    buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 1, 2, 5],
    registers: [this.registry],
  });

  readonly httpRequestTotal = new Counter({
    name: 'http_requests_total',
    help: 'Total HTTP requests',
    labelNames: ['method', 'route', 'status_code'],
    registers: [this.registry],
  });

  readonly httpErrorTotal = new Counter({
    name: 'http_errors_total',
    help: 'Total HTTP errors',
    labelNames: ['method', 'route', 'status_code'],
    registers: [this.registry],
  });

  readonly kycSubmissions = new Counter({
    name: 'kyc_submissions_total',
    help: 'Total KYC submissions',
    labelNames: ['type'],
    registers: [this.registry],
  });

  readonly kycVerifications = new Counter({
    name: 'kyc_verifications_total',
    help: 'Total KYC verifications',
    labelNames: ['status'],
    registers: [this.registry],
  });

  readonly trustRecalculations = new Counter({
    name: 'trust_recalculations_total',
    help: 'Total trust score recalculations',
    registers: [this.registry],
  });

  readonly fraudDetections = new Counter({
    name: 'fraud_detections_total',
    help: 'Total fraud detections',
    labelNames: ['risk_level'],
    registers: [this.registry],
  });

  readonly repaymentThroughput = new Counter({
    name: 'repayments_processed_total',
    help: 'Total repayments processed',
    labelNames: ['status'],
    registers: [this.registry],
  });

  readonly activeWebsocketConnections = new Gauge({
    name: 'websocket_connections_active',
    help: 'Active WebSocket connections',
    registers: [this.registry],
  });

  readonly reconciliationFailures = new Counter({
    name: 'reconciliation_failures_total',
    help: 'Total reconciliation failures',
    registers: [this.registry],
  });

  readonly treasuryBalance = new Gauge({
    name: 'treasury_balance_ngn',
    help: 'Total treasury balance in NGN',
    registers: [this.registry],
  });

  onModuleInit() {
    collectDefaultMetrics({ register: this.registry });
  }

  async getMetrics(): Promise<string> {
    return this.registry.metrics();
  }
}
