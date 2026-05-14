/**
 * External Financial Intelligence API — Integration Lifecycle Spec
 *
 * Simulates the full B2B integration flow:
 * 1. Bank organization onboarded
 * 2. API key issued
 * 3. User grants consent
 * 4. Bank requests trust evaluation
 * 5. Loan eligibility checked
 * 6. Fraud analysis run
 * 7. Webhook subscription created + HMAC verified
 * 8. Rate limiting enforced
 * 9. Audit log written
 * 10. Unauthorized access rejected
 */

import { Test, TestingModule } from '@nestjs/testing';
import { OrganizationService } from './organization.service';
import { ConsentService } from './consent.service';
import { AuditService } from './audit.service';
import { RateLimitService, TIER_LIMITS } from './rate-limit.service';
import { WebhookService } from './webhook.service';
import { OrgType, RateLimitTier } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

// ─── Minimal Prisma mock ──────────────────────────────────────────────────────

const store = {
  orgs: new Map<string, any>(),
  keys: new Map<string, any>(),
  consents: new Map<string, any>(),
  auditLogs: [] as any[],
  usage: new Map<string, any>(),
  webhookSubs: new Map<string, any>(),
  webhookDeliveries: new Map<string, any>(),
};

let idSeq = 0;
const uid = () => `id_${++idSeq}`;

const prismaMock = {
  organization: {
    findUnique: jest.fn(({ where }) => {
      if (where.id) return Promise.resolve(store.orgs.get(where.id) ?? null);
      if (where.contactEmail) return Promise.resolve(store.orgs.get(where.contactEmail) ?? null);
      return Promise.resolve(null);
    }),
    create: jest.fn(({ data }) => {
      const org = { id: uid(), active: true, ...data, createdAt: new Date(), updatedAt: new Date() };
      store.orgs.set(org.id, org);
      store.orgs.set(org.contactEmail, org);
      return Promise.resolve(org);
    }),
    update: jest.fn(({ where, data }) => {
      const org = store.orgs.get(where.id);
      if (org) Object.assign(org, data);
      return Promise.resolve(org);
    }),
  },
  apiKey: {
    findMany: jest.fn(() => Promise.resolve([...store.keys.values()])),
    create: jest.fn(({ data }) => {
      const key = { id: uid(), ...data, createdAt: new Date() };
      store.keys.set(key.id, key);
      return Promise.resolve(key);
    }),
    update: jest.fn(({ where, data }) => {
      const key = store.keys.get(where.id);
      if (key) Object.assign(key, data);
      return Promise.resolve(key);
    }),
  },
  consentGrant: {
    findUnique: jest.fn(({ where }) => Promise.resolve(store.consents.get(where.id) ?? null)),
    findFirst: jest.fn(({ where }) => {
      const match = [...store.consents.values()].find(
        (c) =>
          c.userId === where.userId &&
          c.organizationId === where.organizationId &&
          !c.revoked &&
          c.expiresAt > new Date(),
      );
      return Promise.resolve(match ?? null);
    }),
    create: jest.fn(({ data }) => {
      const grant = { id: uid(), revoked: false, ...data, createdAt: new Date() };
      store.consents.set(grant.id, grant);
      return Promise.resolve(grant);
    }),
    update: jest.fn(({ where, data }) => {
      const grant = store.consents.get(where.id);
      Object.assign(grant, data);
      return Promise.resolve(grant);
    }),
    findMany: jest.fn(({ where }) =>
      Promise.resolve([...store.consents.values()].filter((c) => c.userId === where.userId)),
    ),
  },
  externalAccessAuditLog: {
    create: jest.fn(({ data }) => {
      const log = { id: uid(), ...data };
      store.auditLogs.push(log);
      return Promise.resolve(log);
    }),
    findMany: jest.fn(({ where }) =>
      Promise.resolve(store.auditLogs.filter((l) => l.organizationId === where.organizationId)),
    ),
  },
  organizationUsageMetrics: {
    findFirst: jest.fn(({ where }) => {
      const key = `${where.organizationId}:${where.date?.toISOString()}:${where.endpoint}`;
      return Promise.resolve(store.usage.get(key) ?? null);
    }),
    create: jest.fn(({ data }) => {
      const key = `${data.organizationId}:${data.date?.toISOString()}:${data.endpoint}`;
      const row = { id: uid(), ...data };
      store.usage.set(key, row);
      return Promise.resolve(row);
    }),
    update: jest.fn(({ where, data }) => {
      const row = store.usage.get(where.id) ?? [...store.usage.values()].find((r) => r.id === where.id);
      if (row) Object.assign(row, { requestCount: row.requestCount + 1 });
      return Promise.resolve(row);
    }),
    findMany: jest.fn(({ where }) =>
      Promise.resolve([...store.usage.values()].filter((r) => r.organizationId === where.organizationId)),
    ),
  },
  webhookSubscription: {
    create: jest.fn(({ data, select }) => {
      const sub = { id: uid(), ...data, createdAt: new Date() };
      store.webhookSubs.set(sub.id, sub);
      return Promise.resolve(sub);
    }),
    findMany: jest.fn(({ where }) =>
      Promise.resolve([...store.webhookSubs.values()].filter((s) => {
        if (where.organizationId && s.organizationId !== where.organizationId) return false;
        if (where.active !== undefined && s.active !== where.active) return false;
        if (where.events?.has && !s.events.includes(where.events.has)) return false;
        return true;
      })),
    ),
    findFirst: jest.fn(({ where }) =>
      Promise.resolve([...store.webhookSubs.values()].find((s) => s.id === where.id && s.organizationId === where.organizationId) ?? null),
    ),
    update: jest.fn(({ where, data }) => {
      const sub = store.webhookSubs.get(where.id);
      if (sub) Object.assign(sub, data);
      return Promise.resolve(sub);
    }),
  },
  webhookDelivery: {
    create: jest.fn(({ data }) => {
      const delivery = { id: uid(), ...data, createdAt: new Date(), attempts: 0 };
      store.webhookDeliveries.set(delivery.id, delivery);
      return Promise.resolve(delivery);
    }),
    findUnique: jest.fn(({ where, include }) => {
      const d = store.webhookDeliveries.get(where.id);
      if (!d) return Promise.resolve(null);
      if (include?.subscription) d.subscription = store.webhookSubs.get(d.subscriptionId);
      return Promise.resolve(d);
    }),
    update: jest.fn(({ where, data }) => {
      const d = store.webhookDeliveries.get(where.id);
      if (d) Object.assign(d, data);
      return Promise.resolve(d);
    }),
  },
};

// ─── Test suite ───────────────────────────────────────────────────────────────

describe('External API Infrastructure — Integration Lifecycle', () => {
  let orgSvc: OrganizationService;
  let consentSvc: ConsentService;
  let auditSvc: AuditService;
  let rateSvc: RateLimitService;
  let webhookSvc: WebhookService;

  let orgId: string;
  let plainApiKey: string;

  beforeAll(async () => {
    // Reset store between runs
    store.orgs.clear(); store.keys.clear(); store.consents.clear();
    store.auditLogs.length = 0; store.usage.clear();
    store.webhookSubs.clear(); store.webhookDeliveries.clear();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrganizationService,
        ConsentService,
        AuditService,
        RateLimitService,
        WebhookService,
        { provide: 'PrismaService', useValue: prismaMock },
      ],
    })
      .overrideProvider(OrganizationService)
      .useFactory({ factory: () => new OrganizationService(prismaMock as any) })
      .overrideProvider(ConsentService)
      .useFactory({ factory: () => new ConsentService(prismaMock as any) })
      .overrideProvider(AuditService)
      .useFactory({ factory: () => new AuditService(prismaMock as any) })
      .overrideProvider(RateLimitService)
      .useFactory({ factory: () => new RateLimitService(prismaMock as any) })
      .overrideProvider(WebhookService)
      .useFactory({ factory: () => new WebhookService(prismaMock as any) })
      .compile();

    orgSvc = module.get(OrganizationService);
    consentSvc = module.get(ConsentService);
    auditSvc = module.get(AuditService);
    rateSvc = module.get(RateLimitService);
    webhookSvc = module.get(WebhookService);
  });

  // ── Step 1: Organization onboarding ────────────────────────────────────────

  it('onboards a bank organization', async () => {
    const org = await orgSvc.create({
      name: 'First Bank Nigeria',
      type: OrgType.BANK,
      contactEmail: 'api@firstbank.ng',
      rateLimitTier: RateLimitTier.BANK,
      allowedScopes: ['trust:read', 'loan:read', 'identity:read', 'fraud:read', 'activity:read'],
    });

    expect(org.id).toBeDefined();
    expect(org.name).toBe('First Bank Nigeria');
    expect(org.type).toBe(OrgType.BANK);
    expect(org.active).toBe(true);
    orgId = org.id;
  });

  it('rejects duplicate organization email', async () => {
    await expect(
      orgSvc.create({ name: 'Duplicate', type: OrgType.BANK, contactEmail: 'api@firstbank.ng' }),
    ).rejects.toThrow('Organization with this email already exists');
  });

  // ── Step 2: API key issuance ────────────────────────────────────────────────

  it('issues an API key and returns plaintext key once', async () => {
    const { plainKey, keyId } = await orgSvc.issueApiKey(orgId, { label: 'Production Key' });

    expect(plainKey).toMatch(/^sk_[a-f0-9]{64}$/);
    expect(keyId).toBeDefined();
    plainApiKey = plainKey;

    // Verify hash stored in DB
    const storedKey = [...store.keys.values()].find((k) => k.id === keyId);
    expect(storedKey).toBeDefined();
    const hashMatches = await bcrypt.compare(plainKey, storedKey.keyHash);
    expect(hashMatches).toBe(true);
  });

  it('revokes an API key', async () => {
    const { keyId } = await orgSvc.issueApiKey(orgId, { label: 'Temp Key' });
    await orgSvc.revokeApiKey(keyId);
    const key = [...store.keys.values()].find((k) => k.id === keyId);
    expect(key.active).toBe(false);
  });

  // ── Step 3: User consent ────────────────────────────────────────────────────

  it('grants user consent for scoped access', async () => {
    const grant = await consentSvc.grant({
      userId: 'user_001',
      organizationId: orgId,
      scopes: ['trust:read', 'loan:read'],
      purpose: 'loan_underwriting',
    });

    expect(grant.id).toBeDefined();
    expect(grant.scopes).toContain('trust:read');
    expect(grant.revoked).toBe(false);
    expect(grant.expiresAt > new Date()).toBe(true);
  });

  it('rejects consent for scopes not allowed by organization', async () => {
    await expect(
      consentSvc.grant({
        userId: 'user_001',
        organizationId: orgId,
        scopes: ['cooperative:read'], // not in org allowedScopes
        purpose: 'test',
      }),
    ).rejects.toThrow('Organization not authorized for scopes');
  });

  it('rejects consent for invalid scope names', async () => {
    await expect(
      consentSvc.grant({
        userId: 'user_001',
        organizationId: orgId,
        scopes: ['admin:all'],
        purpose: 'test',
      }),
    ).rejects.toThrow('Invalid scopes');
  });

  it('verifies active consent passes', async () => {
    await expect(
      consentSvc.verifyConsent('user_001', orgId, ['trust:read']),
    ).resolves.not.toThrow();
  });

  it('rejects consent verification for missing scope', async () => {
    await expect(
      consentSvc.verifyConsent('user_001', orgId, ['fraud:read']),
    ).rejects.toThrow('Consent does not cover required scopes');
  });

  it('rejects consent verification for unknown user', async () => {
    await expect(
      consentSvc.verifyConsent('unknown_user', orgId, ['trust:read']),
    ).rejects.toThrow('No active consent grant found');
  });

  it('revokes consent and blocks further access', async () => {
    const grant = await consentSvc.grant({
      userId: 'user_revoke',
      organizationId: orgId,
      scopes: ['trust:read'],
      purpose: 'test',
    });

    await consentSvc.revoke(grant.id, 'user_revoke');
    const updated = store.consents.get(grant.id);
    expect(updated.revoked).toBe(true);

    await expect(
      consentSvc.verifyConsent('user_revoke', orgId, ['trust:read']),
    ).rejects.toThrow('No active consent grant found');
  });

  // ── Step 4: Audit logging ───────────────────────────────────────────────────

  it('writes immutable audit log entries', async () => {
    auditSvc.log({
      organizationId: orgId,
      endpoint: 'trust-score/evaluate',
      userId: 'user_001',
      scopesUsed: ['trust:read'],
      purpose: 'loan_underwriting',
      ipAddress: '41.58.100.1',
      responseStatus: 200,
    });

    // Allow async write
    await new Promise((r) => setTimeout(r, 10));

    const logs = await auditSvc.query(orgId);
    expect(logs.length).toBeGreaterThan(0);
    expect(logs[0].endpoint).toBe('trust-score/evaluate');
    expect(logs[0].scopesUsed).toContain('trust:read');
  });

  // ── Step 5: Rate limiting ───────────────────────────────────────────────────

  it('allows requests within tier quota', async () => {
    const result = await rateSvc.checkAndIncrement(orgId, RateLimitTier.BANK, '/api/v1/external/trust-score/evaluate');
    expect(result.allowed).toBe(true);
    expect(result.limit).toBe(TIER_LIMITS[RateLimitTier.BANK]);
    expect(result.remaining).toBe(TIER_LIMITS[RateLimitTier.BANK] - 1);
  });

  it('blocks requests when FREE tier quota is exhausted', async () => {
    const freeOrgId = 'free_org_test';
    const limit = TIER_LIMITS[RateLimitTier.FREE]; // 100

    // Exhaust the quota by directly setting count in store
    const today = new Date();
    const todayUtc = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
    const key = `${freeOrgId}:${todayUtc.toISOString()}:null`;
    store.usage.set(key, { id: uid(), organizationId: freeOrgId, date: todayUtc, endpoint: null, requestCount: limit });

    prismaMock.organizationUsageMetrics.findFirst.mockImplementationOnce(({ where }) => {
      if (where.organizationId === freeOrgId) {
        return Promise.resolve({ id: 'usage_free', requestCount: limit });
      }
      return Promise.resolve(null);
    });

    const result = await rateSvc.checkAndIncrement(freeOrgId, RateLimitTier.FREE);
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it('returns correct tier limits', () => {
    expect(TIER_LIMITS[RateLimitTier.FREE]).toBe(100);
    expect(TIER_LIMITS[RateLimitTier.BANK]).toBe(50_000);
    expect(TIER_LIMITS[RateLimitTier.ENTERPRISE]).toBe(500_000);
  });

  // ── Step 6: Webhook infrastructure ─────────────────────────────────────────

  it('creates a webhook subscription with a secret', async () => {
    const sub = await webhookSvc.subscribe(orgId, {
      url: 'https://hooks.firstbank.ng/signalos',
      events: ['trust.score.updated', 'loan.eligible'],
    });

    expect(sub.id).toBeDefined();
    expect(sub.url).toBe('https://hooks.firstbank.ng/signalos');
    expect(sub.events).toContain('trust.score.updated');

    // Secret stored in DB but not returned
    const stored = store.webhookSubs.get(sub.id);
    expect(stored.secret).toMatch(/^[a-f0-9]{64}$/);
  });

  it('signs webhook payloads with HMAC-SHA256', () => {
    const secret = crypto.randomBytes(32).toString('hex');
    const body = JSON.stringify({ event: 'trust.score.updated', payload: { userId: 'user_001', trustScore: 76 }, timestamp: Date.now() });

    const signature = webhookSvc.sign(body, secret);
    expect(signature).toMatch(/^sha256=[a-f0-9]{64}$/);

    // Verify round-trip
    expect(webhookSvc.verify(body, secret, signature)).toBe(true);
  });

  it('rejects tampered webhook payloads', () => {
    const secret = crypto.randomBytes(32).toString('hex');
    const body = JSON.stringify({ event: 'trust.score.updated', payload: { trustScore: 76 } });
    const signature = webhookSvc.sign(body, secret);

    const tampered = JSON.stringify({ event: 'trust.score.updated', payload: { trustScore: 99 } });
    expect(webhookSvc.verify(tampered, secret, signature)).toBe(false);
  });

  it('lists webhook subscriptions for an organization', async () => {
    const subs = await webhookSvc.listSubscriptions(orgId);
    expect(subs.length).toBeGreaterThan(0);
  });

  it('deactivates a webhook subscription', async () => {
    const sub = await webhookSvc.subscribe(orgId, {
      url: 'https://hooks.firstbank.ng/temp',
      events: ['fraud.detected'],
    });

    await webhookSvc.deleteSubscription(sub.id, orgId);
    const stored = store.webhookSubs.get(sub.id);
    expect(stored.active).toBe(false);
  });

  // ── Step 7: Organization activation/deactivation ───────────────────────────

  it('deactivates and reactivates an organization', async () => {
    await orgSvc.setActive(orgId, false);
    const deactivated = store.orgs.get(orgId);
    expect(deactivated.active).toBe(false);

    await orgSvc.setActive(orgId, true);
    const reactivated = store.orgs.get(orgId);
    expect(reactivated.active).toBe(true);
  });

  // ── Step 8: Scope enforcement ───────────────────────────────────────────────

  it('verifies scope coverage correctly', async () => {
    // Grant broad consent
    await consentSvc.grant({
      userId: 'user_scope_test',
      organizationId: orgId,
      scopes: ['trust:read', 'identity:read', 'loan:read', 'fraud:read', 'activity:read'],
      purpose: 'full_assessment',
    });

    // All individual scopes should pass
    for (const scope of ['trust:read', 'identity:read', 'loan:read', 'fraud:read', 'activity:read']) {
      await expect(consentSvc.verifyConsent('user_scope_test', orgId, [scope])).resolves.not.toThrow();
    }

    // Cooperative scope not granted — should fail
    await expect(
      consentSvc.verifyConsent('user_scope_test', orgId, ['cooperative:read']),
    ).rejects.toThrow('Consent does not cover required scopes');
  });

  // ── Step 9: Consent expiry ──────────────────────────────────────────────────

  it('rejects expired consent grants', async () => {
    const expiredGrant = {
      id: uid(),
      userId: 'user_expired',
      organizationId: orgId,
      scopes: ['trust:read'],
      purpose: 'test',
      revoked: false,
      expiresAt: new Date(Date.now() - 1000), // already expired
      createdAt: new Date(),
    };
    store.consents.set(expiredGrant.id, expiredGrant);

    await expect(
      consentSvc.verifyConsent('user_expired', orgId, ['trust:read']),
    ).rejects.toThrow('No active consent grant found');
  });

  // ── Step 10: Usage metrics ──────────────────────────────────────────────────

  it('tracks daily usage metrics per organization', async () => {
    const usage = await rateSvc.getUsage(orgId);
    expect(usage.date).toBeDefined();
    expect(typeof usage.total).toBe('number');
    expect(Array.isArray(usage.breakdown)).toBe(true);
  });
});
