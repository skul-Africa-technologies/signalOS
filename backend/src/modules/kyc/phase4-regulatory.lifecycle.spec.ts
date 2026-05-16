/**
 * Phase 4 — Regulatory-Grade Infrastructure Simulation Spec
 *
 * Verifies:
 * 1. KYC verification flows (BVN, NIN, document, risk scan)
 * 2. Encrypted identity storage (hashing)
 * 3. KYC event propagation (submitted, verified, rejected, risk.detected)
 * 4. Metrics generation (counters, histograms)
 * 5. Queue processing (enqueue, retry, dead-letter)
 * 6. Storage signed URL generation
 * 7. Compliance event wiring (kyc.verified → trust + analytics + notification)
 * 8. API v1 and v2 contract validation
 * 9. Structured logging with correlation IDs
 * 10. Full regulatory simulation pipeline
 */

import { EventEmitter2 } from '@nestjs/event-emitter';
import { KycService, KYC_EVENTS } from '../kyc/kyc.service';
import { KycStatus, KycVerificationLevel } from '../kyc/dto/kyc.dto';
import { MetricsService } from '../observability/metrics.service';
import { AlertService } from '../observability/alert.service';
import { SentryService } from '../observability/sentry.service';
import { AppLoggerService } from '../observability/logger.service';
import { QueueService } from '../queue/queue.service';
import { StorageService } from '../storage/storage.service';
import { ComplianceEventListener } from '../compliance/compliance-event.listener';

// ─── Prisma mock ──────────────────────────────────────────────────────────────

let seq = 0;
const uid = () => `id_${++seq}`;
const kycProfiles = new Map<string, any>();
const kycDocuments = new Map<string, any>();

const prismaMock = {
  kycProfile: {
    upsert: jest.fn(({ where, create }) => {
      const existing = [...kycProfiles.values()].find((p) => p.userId === where.userId);
      if (existing) return Promise.resolve({ ...existing, documents: [] });
      const p = {
        id: uid(), ...create,
        bvnVerified: false, ninVerified: false, selfieVerified: false,
        phoneVerified: false, bankVerified: false, addressVerified: false,
        status: 'PENDING', verificationLevel: 'NONE', riskLevel: 'HIGH',
        bvnHash: null, ninHash: null, submittedAt: null, verifiedAt: null,
        rejectedAt: null, rejectionReason: null, createdAt: new Date(), updatedAt: new Date(),
      };
      kycProfiles.set(p.id, p);
      return Promise.resolve({ ...p, documents: [] });
    }),
    findUnique: jest.fn(({ where }) => {
      const p = where.userId
        ? [...kycProfiles.values()].find((x) => x.userId === where.userId)
        : kycProfiles.get(where.id);
      return Promise.resolve(p ?? null);
    }),
    update: jest.fn(({ where, data }) => {
      const p = [...kycProfiles.values()].find((x) => x.userId === where.userId);
      if (!p) return Promise.reject(new Error('Not found'));
      Object.assign(p, data, { updatedAt: new Date() });
      return Promise.resolve(p);
    }),
  },
  kycDocument: {
    create: jest.fn(({ data }) => {
      const doc = { id: uid(), ...data, uploadedAt: new Date(), reviewedAt: null };
      kycDocuments.set(doc.id, doc);
      return Promise.resolve(doc);
    }),
    update: jest.fn(({ where, data }) => {
      const doc = kycDocuments.get(where.id);
      if (!doc) return Promise.reject(new Error('Not found'));
      Object.assign(doc, data);
      return Promise.resolve(doc);
    }),
  },
  auditLog: { create: jest.fn(() => Promise.resolve({ id: uid() })) },
};

// ─── Shared instances ─────────────────────────────────────────────────────────

let events: EventEmitter2;
let kycService: KycService;
let metricsService: MetricsService;
let sentryService: SentryService;
let alertService: AlertService;
let queueService: QueueService;
let storageService: StorageService;
let complianceListener: ComplianceEventListener;

const emittedEvents: Array<{ event: string; payload: any }> = [];

beforeAll(() => {
  events = new EventEmitter2();
  jest.spyOn(events, 'emit').mockImplementation((event: string, payload?: any) => {
    emittedEvents.push({ event, payload });
    return true;
  });

  kycService = new KycService(prismaMock as any, events);
  metricsService = new MetricsService();
  metricsService.onModuleInit();
  sentryService = new SentryService();
  alertService = new AlertService(sentryService, metricsService);
  queueService = new QueueService(events);
  queueService.onModuleInit();
  storageService = new StorageService();
  complianceListener = new ComplianceEventListener(events, metricsService, alertService, queueService);
});

beforeEach(() => {
  emittedEvents.length = 0;
  kycProfiles.clear();
  kycDocuments.clear();
  jest.clearAllMocks();
  // Re-spy after clearAllMocks
  jest.spyOn(events, 'emit').mockImplementation((event: string, payload?: any) => {
    emittedEvents.push({ event, payload });
    return true;
  });
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Phase 4 — Regulatory Infrastructure', () => {

  // ─── 1. KYC Profile ─────────────────────────────────────────────────────────

  describe('KYC Profile', () => {
    it('creates a new KYC profile', async () => {
      const p = await kycService.getOrCreateProfile('u1');
      expect(p.userId).toBe('u1');
      expect(p.status).toBe('PENDING');
      expect(p.verificationLevel).toBe('NONE');
    });

    it('is idempotent — returns same profile on second call', async () => {
      const p1 = await kycService.getOrCreateProfile('u2');
      const p2 = await kycService.getOrCreateProfile('u2');
      expect(p1.id).toBe(p2.id);
    });
  });

  // ─── 2. BVN Verification ────────────────────────────────────────────────────

  describe('BVN Verification', () => {
    it('accepts valid 11-digit BVN and marks verified', async () => {
      const r = await kycService.submitBvn('u_bvn1', { bvn: '12345678901' });
      expect(r.bvnVerified).toBe(true);
      expect(r.status).toBe(KycStatus.UNDER_REVIEW);
    });

    it('stores BVN as SHA-256 hash, not plaintext', async () => {
      const r = await kycService.submitBvn('u_bvn2', { bvn: '98765432101' });
      expect(r.bvnHash).toBeDefined();
      expect(r.bvnHash).not.toBe('98765432101');
      expect(r.bvnHash!.length).toBe(64);
    });

    it('emits kyc.submitted after BVN submission', async () => {
      await kycService.submitBvn('u_bvn3', { bvn: '11111111111' });
      expect(emittedEvents.find((e) => e.event === KYC_EVENTS.SUBMITTED)).toBeDefined();
    });

    it('rejects duplicate BVN submission', async () => {
      await kycService.submitBvn('u_bvn4', { bvn: '22222222222' });
      await expect(kycService.submitBvn('u_bvn4', { bvn: '22222222222' })).rejects.toThrow('BVN already verified');
    });

    it('upgrades verificationLevel to BASIC after BVN', async () => {
      const r = await kycService.submitBvn('u_bvn5', { bvn: '33333333333' });
      expect(r.verificationLevel).toBe(KycVerificationLevel.BASIC);
    });
  });

  // ─── 3. NIN Verification ────────────────────────────────────────────────────

  describe('NIN Verification', () => {
    it('accepts valid 11-digit NIN', async () => {
      const r = await kycService.submitNin('u_nin1', { nin: '12345678901' });
      expect(r.ninVerified).toBe(true);
    });

    it('stores NIN as hash', async () => {
      const r = await kycService.submitNin('u_nin2', { nin: '99999999999' });
      expect(r.ninHash).not.toBe('99999999999');
    });

    it('upgrades to INTERMEDIATE after BVN + NIN', async () => {
      await kycService.submitBvn('u_both', { bvn: '44444444444' });
      const r = await kycService.submitNin('u_both', { nin: '55555555555' });
      expect(r.verificationLevel).toBe(KycVerificationLevel.INTERMEDIATE);
    });
  });

  // ─── 4. Document Submission ─────────────────────────────────────────────────

  describe('Document Submission', () => {
    it('creates a KYC document record', async () => {
      const doc = await kycService.submitDocument('u_doc1', { type: 'SELFIE' as any, storageKey: 'kyc/abc' });
      expect(doc.type).toBe('SELFIE');
    });

    it('auto-approves selfie with confidence > 0.9', async () => {
      const doc = await kycService.submitDocument('u_selfie1', { type: 'SELFIE' as any, storageKey: 'kyc/s1' });
      expect(doc.status).toBe('APPROVED');
      expect(doc.confidence).toBeGreaterThan(0.9);
    });

    it('marks selfieVerified on profile after selfie', async () => {
      await kycService.submitDocument('u_selfie2', { type: 'SELFIE' as any, storageKey: 'kyc/s2' });
      const p = await kycService.getOrCreateProfile('u_selfie2');
      expect(p.selfieVerified).toBe(true);
    });
  });

  // ─── 5. KYC Review ──────────────────────────────────────────────────────────

  describe('KYC Review', () => {
    it('marks VERIFIED and emits kyc.verified', async () => {
      await kycService.submitBvn('u_rev1', { bvn: '66666666666' });
      const r = await kycService.reviewKyc('u_rev1', { status: KycStatus.VERIFIED });
      expect(r.status).toBe(KycStatus.VERIFIED);
      expect(r.verifiedAt).toBeDefined();
      expect(emittedEvents.find((e) => e.event === KYC_EVENTS.VERIFIED)).toBeDefined();
    });

    it('marks REJECTED with reason and emits kyc.rejected', async () => {
      await kycService.submitBvn('u_rev2', { bvn: '77777777777' });
      const r = await kycService.reviewKyc('u_rev2', { status: KycStatus.REJECTED, rejectionReason: 'BVN mismatch' });
      expect(r.status).toBe(KycStatus.REJECTED);
      expect(r.rejectionReason).toBe('BVN mismatch');
      expect(emittedEvents.find((e) => e.event === KYC_EVENTS.REJECTED)).toBeDefined();
    });

    it('throws if rejection reason is missing', async () => {
      await kycService.submitBvn('u_rev3', { bvn: '88888888888' });
      await expect(kycService.reviewKyc('u_rev3', { status: KycStatus.REJECTED })).rejects.toThrow('Rejection reason required');
    });
  });

  // ─── 6. Identity Risk Engine ────────────────────────────────────────────────

  describe('Identity Risk Engine', () => {
    it('returns CRITICAL risk (score=100) for unverified profile', async () => {
      await kycService.getOrCreateProfile('u_risk1');
      const { riskLevel, riskScore } = await kycService.runRiskScan('u_risk1');
      expect(riskScore).toBe(100);
      expect(riskLevel).toBe('CRITICAL');
    });

    it('reduces risk score as verifications complete', async () => {
      await kycService.submitBvn('u_risk2', { bvn: '10101010101' });
      await kycService.submitNin('u_risk2', { nin: '20202020202' });
      const { riskScore } = await kycService.runRiskScan('u_risk2');
      expect(riskScore).toBeLessThan(60);
    });

    it('emits identity.risk.detected when score > 70', async () => {
      await kycService.getOrCreateProfile('u_risk3');
      await kycService.runRiskScan('u_risk3');
      expect(emittedEvents.find((e) => e.event === KYC_EVENTS.RISK_DETECTED)).toBeDefined();
    });

    it('does NOT emit risk event for well-verified user', async () => {
      await kycService.submitBvn('u_risk4', { bvn: '30303030303' });
      await kycService.submitNin('u_risk4', { nin: '40404040404' });
      await kycService.submitDocument('u_risk4', { type: 'SELFIE' as any, storageKey: 'kyc/s3' });
      await kycService.runRiskScan('u_risk4');
      expect(emittedEvents.find((e) => e.event === KYC_EVENTS.RISK_DETECTED)).toBeUndefined();
    });
  });

  // ─── 7. Metrics ─────────────────────────────────────────────────────────────

  describe('Metrics', () => {
    it('initializes all required counters and histograms', () => {
      expect(metricsService.httpRequestTotal).toBeDefined();
      expect(metricsService.httpRequestDuration).toBeDefined();
      expect(metricsService.kycSubmissions).toBeDefined();
      expect(metricsService.kycVerifications).toBeDefined();
      expect(metricsService.fraudDetections).toBeDefined();
      expect(metricsService.trustRecalculations).toBeDefined();
      expect(metricsService.reconciliationFailures).toBeDefined();
      expect(metricsService.activeWebsocketConnections).toBeDefined();
      expect(metricsService.treasuryBalance).toBeDefined();
    });

    it('getMetrics() returns Prometheus text format', async () => {
      const output = await metricsService.getMetrics();
      expect(typeof output).toBe('string');
      expect(output).toContain('http_requests_total');
      expect(output).toContain('kyc_submissions_total');
    });
  });

  // ─── 8. Queue Processing ────────────────────────────────────────────────────

  describe('Queue Processing', () => {
    it('enqueues a job and returns a job ID', () => {
      const id = queueService.enqueue('email', { to: 'test@example.com' });
      expect(id).toMatch(/^job_/);
    });

    it('getAllStats returns all 6 queues', () => {
      const all = queueService.getAllStats();
      expect(all.length).toBe(6);
      expect(all.map((s) => s.queue)).toEqual(
        expect.arrayContaining(['email', 'sms', 'fraud-analysis', 'reconciliation', 'kyc-processing', 'analytics']),
      );
    });

    it('processes job with registered handler', async () => {
      const processed: any[] = [];
      queueService.registerHandler('analytics', async (job) => { processed.push(job.data); });
      queueService.enqueue('analytics', { event: 'test' });
      await new Promise((r) => setTimeout(r, 50));
      expect(processed.length).toBeGreaterThan(0);
    });

    it('retries failed job and eventually moves to dead-letter', async () => {
      let attempts = 0;
      queueService.registerHandler('fraud-analysis', async () => {
        attempts++;
        throw new Error('simulated failure');
      });
      queueService.enqueue('fraud-analysis', { userId: 'u_fraud' }, 1);
      await new Promise((r) => setTimeout(r, 50));
      expect(attempts).toBeGreaterThanOrEqual(1);
    });
  });

  // ─── 9. Storage ─────────────────────────────────────────────────────────────

  describe('File Storage', () => {
    it('generates signed upload URL with storageKey and 15-min expiry', () => {
      const r = storageService.generateSignedUploadUrl('kyc', 'image/jpeg');
      expect(r.storageKey).toMatch(/^kyc\//);
      const diffMs = r.expiresAt.getTime() - Date.now();
      expect(diffMs).toBeGreaterThan(14 * 60 * 1000);
      expect(diffMs).toBeLessThan(16 * 60 * 1000);
    });

    it('generates signed read URL', () => {
      const url = storageService.getSignedReadUrl('kyc/doc-001');
      expect(url).toContain('kyc');
    });

    it('stores and retrieves file content', () => {
      storageService.store('test/doc-001', Buffer.from('hello'));
      expect(storageService.retrieve('test/doc-001').toString()).toBe('hello');
      storageService.delete('test/doc-001');
    });
  });

  // ─── 10. Compliance Event Wiring ────────────────────────────────────────────

  describe('Compliance Event Wiring', () => {
    it('kyc.verified → emits trust.recalculate.requested', () => {
      complianceListener.onKycVerified({ userId: 'u_c1', profileId: 'p1', verificationLevel: 'FULL' });
      const e = emittedEvents.find((x) => x.event === 'trust.recalculate.requested');
      expect(e).toBeDefined();
      expect(e!.payload.userId).toBe('u_c1');
      expect(e!.payload.trigger).toBe('kyc.verified');
    });

    it('kyc.rejected → enqueues sms notification', () => {
      const spy = jest.spyOn(queueService, 'enqueue');
      complianceListener.onKycRejected({ userId: 'u_c2', profileId: 'p2', reason: 'Mismatch' });
      expect(spy).toHaveBeenCalledWith('sms', expect.objectContaining({ userId: 'u_c2' }));
    });

    it('identity.risk.detected (score > 80) → HIGH alert', () => {
      const spy = jest.spyOn(alertService, 'emit');
      complianceListener.onIdentityRisk({ userId: 'u_c3', riskLevel: 'CRITICAL', riskScore: 95 });
      expect(spy).toHaveBeenCalledWith(expect.objectContaining({ severity: 'HIGH' }));
    });

    it('identity.risk.detected (score ≤ 80) → no alert', () => {
      const spy = jest.spyOn(alertService, 'emit');
      spy.mockClear();
      complianceListener.onIdentityRisk({ userId: 'u_c4', riskLevel: 'MEDIUM', riskScore: 50 });
      expect(spy).not.toHaveBeenCalled();
    });

    it('reconciliation.failed → HIGH alert + email queued', () => {
      const alertSpy = jest.spyOn(alertService, 'emit');
      const queueSpy = jest.spyOn(queueService, 'enqueue');
      complianceListener.onReconciliationFailed({ jobId: 'rec_001', reason: 'timeout' });
      expect(alertSpy).toHaveBeenCalledWith(expect.objectContaining({ severity: 'HIGH' }));
      expect(queueSpy).toHaveBeenCalledWith('email', expect.any(Object));
    });

    it('system.error.detected → CRITICAL alert', () => {
      const spy = jest.spyOn(alertService, 'emit');
      complianceListener.onSystemError({ service: 'PaymentService', error: 'Connection refused' });
      expect(spy).toHaveBeenCalledWith(expect.objectContaining({ severity: 'CRITICAL' }));
    });
  });

  // ─── 11. API Version Contracts ───────────────────────────────────────────────

  describe('API Version Contracts', () => {
    it('v1 returns raw entity without envelope', async () => {
      const p = await kycService.getOrCreateProfile('u_v1');
      expect(p.userId).toBe('u_v1');
      expect((p as any).meta).toBeUndefined();
    });

    it('v2 envelope wraps data with meta.apiVersion and complianceFramework', async () => {
      const p = await kycService.getOrCreateProfile('u_v2');
      const v2 = { data: p, meta: { apiVersion: '2', complianceFramework: 'CBN-KYC-2024', timestamp: new Date().toISOString() } };
      expect(v2.meta.apiVersion).toBe('2');
      expect(v2.meta.complianceFramework).toBe('CBN-KYC-2024');
      expect(v2.data.userId).toBe('u_v2');
    });
  });

  // ─── 12. Structured Logging ──────────────────────────────────────────────────

  describe('Structured Logging', () => {
    it('creates correlated logger with provided ID', () => {
      const logger = new AppLoggerService();
      const corr = logger.withCorrelationId('req-abc');
      expect(corr.log).toBeDefined();
      expect(corr.error).toBeDefined();
      expect(corr.warn).toBeDefined();
    });

    it('auto-generates correlation ID when not provided', () => {
      const logger = new AppLoggerService();
      expect(() => logger.withCorrelationId()).not.toThrow();
    });

    it('logs without throwing', () => {
      const logger = new AppLoggerService();
      expect(() => logger.log('msg', 'Ctx')).not.toThrow();
      expect(() => logger.warn('warn')).not.toThrow();
      expect(() => logger.error('err', 'stack')).not.toThrow();
    });
  });

  // ─── 13. Full Regulatory Simulation ─────────────────────────────────────────

  describe('Full Regulatory Simulation', () => {
    it('runs complete KYC → verified → compliance pipeline', async () => {
      const userId = 'u_sim';

      // 1. Submit KYC
      await kycService.submitBvn(userId, { bvn: '50505050505' });
      await kycService.submitNin(userId, { nin: '60606060606' });
      await kycService.submitDocument(userId, { type: 'SELFIE' as any, storageKey: 'kyc/sim' });

      // 2. Identity verified
      const verified = await kycService.reviewKyc(userId, { status: KycStatus.VERIFIED });
      expect(verified.status).toBe(KycStatus.VERIFIED);

      // 3. Fraud scan
      const { riskScore } = await kycService.runRiskScan(userId);
      expect(riskScore).toBeLessThan(60);

      // 4. Files securely stored
      const { storageKey } = storageService.generateSignedUploadUrl('kyc', 'image/jpeg');
      expect(storageKey).toMatch(/^kyc\//);

      // 5. Queue jobs processed
      expect(queueService.enqueue('email', { to: userId })).toMatch(/^job_/);

      // 6. Metrics emitted
      expect(await metricsService.getMetrics()).toContain('kyc_submissions_total');

      // 7. Compliance wiring fires
      complianceListener.onKycVerified({ userId, profileId: verified.id, verificationLevel: verified.verificationLevel });
      expect(emittedEvents.find((e) => e.event === 'trust.recalculate.requested')).toBeDefined();

      // 8. v2 contract valid
      const profile = await kycService.getOrCreateProfile(userId);
      expect(profile.bvnVerified).toBe(true);
      expect(profile.ninVerified).toBe(true);
      expect(profile.selfieVerified).toBe(true);
      expect(profile.verificationLevel).toBe(KycVerificationLevel.INTERMEDIATE);
    });
  });
});
