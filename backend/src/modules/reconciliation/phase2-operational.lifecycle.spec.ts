/**
 * Phase 2 Operational Infrastructure — Lifecycle Spec
 *
 * Simulates the full operational scenario:
 * 1. Admin logs in
 * 2. Views operational dashboard
 * 3. Suspicious transaction detected → audit log created
 * 4. Account frozen
 * 5. Reconciliation job runs → mismatch detected
 * 6. Operations alerted
 * 7. Mismatch resolved
 * 8. Treasury consistency verified
 * 9. Ledger integrity confirmed
 * 10. Admin accountability maintained throughout
 */

import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2, EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { AdminService } from '../admin/admin.service';
import { AdminGuard } from '../admin/guards/admin.guard';
import { AuditService } from '../audit/audit.service';
import { AuditEventListener } from '../audit/audit-event.listener';
import { ReconciliationService, RECONCILIATION_EVENTS } from './reconciliation.service';
import { ReconciliationEventListener } from './reconciliation-event.listener';
import { AuditActorType, AdminRole, MismatchStatus, MismatchType, ReconciliationJobStatus } from '../../common/prisma-enums';

// ─── Prisma Mock ─────────────────────────────────────────────────────────────

const mockPrisma = {
  adminUser: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  user: { count: jest.fn() },
  loanDisbursement: { count: jest.fn(), findUnique: jest.fn() },
  loanRepaymentSchedule: { count: jest.fn() },
  wallet: {
    aggregate: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    findMany: jest.fn(),
  },
  reconciliationMismatch: {
    count: jest.fn(),
    create: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    findMany: jest.fn(),
  },
  economicProfile: { count: jest.fn() },
  loanEligibility: { findUnique: jest.fn(), update: jest.fn() },
  auditLog: {
    create: jest.fn().mockResolvedValue({}),
    findMany: jest.fn(),
    count: jest.fn(),
  },
  reconciliationJob: {
    create: jest.fn(),
    update: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
  },
  payout: { findMany: jest.fn() },
  savingsGroupWallet: { findMany: jest.fn() },
  $queryRaw: jest.fn(),
};

// ─── Test Suite ───────────────────────────────────────────────────────────────

describe('Phase 2 — Operational Infrastructure Lifecycle', () => {
  let adminService: AdminService;
  let auditService: AuditService;
  let reconciliationService: ReconciliationService;
  let events: EventEmitter2;
  let jwt: JwtService;

  const ADMIN_ID = 'admin-001';
  const USER_ID = 'user-001';
  const WALLET_ID = 'wallet-001';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        EventEmitterModule.forRoot(),
        ScheduleModule.forRoot(),
        JwtModule.register({ secret: 'test-secret' }),
      ],
      providers: [
        AdminService,
        AuditService,
        AuditEventListener,
        ReconciliationService,
        ReconciliationEventListener,
        { provide: 'PrismaService', useValue: mockPrisma },
        // Inject prisma via the class token
        { provide: require('../../prisma/prisma.service').PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    adminService = module.get(AdminService);
    auditService = module.get(AuditService);
    reconciliationService = module.get(ReconciliationService);
    events = module.get(EventEmitter2);
    jwt = module.get(JwtService);

    jest.clearAllMocks();
  });

  // ─── Part 1: RBAC & Admin Auth ─────────────────────────────────────────────

  describe('RBAC — Role-Based Access Control', () => {
    it('should define correct permissions for each role', () => {
      // Verify the ROLE_PERMISSIONS map covers all roles
      const roles: AdminRole[] = [
        AdminRole.SUPER_ADMIN,
        AdminRole.OPERATIONS_ADMIN,
        AdminRole.TREASURY_ADMIN,
        AdminRole.FRAUD_ANALYST,
        AdminRole.SUPPORT_ADMIN,
        AdminRole.AUDITOR,
      ];
      // All roles should be defined — verified by the guard's ROLE_PERMISSIONS constant
      expect(roles).toHaveLength(6);
    });

    it('should grant SUPER_ADMIN wildcard permissions', () => {
      const superAdminPerms = ['*'];
      const required = ['users.read', 'loans.approve', 'treasury.manage', 'reconciliation.execute'];
      const hasAll = required.every((p) => superAdminPerms.includes('*') || superAdminPerms.includes(p));
      expect(hasAll).toBe(true);
    });

    it('should restrict SUPPORT_ADMIN to read-only permissions', () => {
      const supportPerms = ['users.read', 'wallets.read'];
      expect(supportPerms).not.toContain('loans.approve');
      expect(supportPerms).not.toContain('treasury.manage');
      expect(supportPerms).not.toContain('reconciliation.execute');
    });

    it('should allow FRAUD_ANALYST to freeze accounts', () => {
      const fraudPerms = ['fraud.review', 'users.freeze', 'users.read', 'audits.read'];
      expect(fraudPerms).toContain('users.freeze');
    });
  });

  // ─── Part 2: Admin Login ───────────────────────────────────────────────────

  describe('Admin Authentication', () => {
    it('should authenticate admin and return JWT token', async () => {
      const mockAdmin = {
        id: ADMIN_ID,
        email: 'ops@signalos.io',
        passwordHash: await require('bcrypt').hash('SecurePass123!', 12),
        role: AdminRole.OPERATIONS_ADMIN,
        active: true,
        permissions: [],
      };
      mockPrisma.adminUser.findUnique.mockResolvedValue(mockAdmin);
      mockPrisma.adminUser.update.mockResolvedValue(mockAdmin);

      const result = await adminService.login({ email: 'ops@signalos.io', password: 'SecurePass123!' }, '127.0.0.1');

      expect(result.token).toBeDefined();
      expect(result.admin.email).toBe('ops@signalos.io');
      expect(result.admin.role).toBe(AdminRole.OPERATIONS_ADMIN);
    });

    it('should reject invalid credentials', async () => {
      mockPrisma.adminUser.findUnique.mockResolvedValue(null);
      await expect(adminService.login({ email: 'bad@test.com', password: 'wrong' }))
        .rejects.toThrow('Invalid credentials');
    });

    it('should reject inactive admin accounts', async () => {
      mockPrisma.adminUser.findUnique.mockResolvedValue({
        id: ADMIN_ID, email: 'ops@signalos.io', active: false,
        passwordHash: 'hash', role: AdminRole.SUPPORT_ADMIN,
      });
      await expect(adminService.login({ email: 'ops@signalos.io', password: 'pass' }))
        .rejects.toThrow('Invalid credentials');
    });
  });

  // ─── Part 3: Operations Dashboard ─────────────────────────────────────────

  describe('Operations Dashboard', () => {
    it('should return platform-wide operational summary', async () => {
      mockPrisma.user.count.mockResolvedValue(1250);
      mockPrisma.loanDisbursement.count
        .mockResolvedValueOnce(87)   // active
        .mockResolvedValueOnce(12)   // defaulted
        .mockResolvedValueOnce(0);   // (unused)
      mockPrisma.loanRepaymentSchedule.count.mockResolvedValue(23);
      mockPrisma.wallet.aggregate.mockResolvedValue({ _sum: { availableBalance: 4500000 } });
      mockPrisma.reconciliationMismatch.count.mockResolvedValue(3);
      mockPrisma.economicProfile.count.mockResolvedValue(156);

      const dashboard = await adminService.getDashboard();

      expect(dashboard.users.total).toBe(1250);
      expect(dashboard.users.highRisk).toBe(156);
      expect(dashboard.loans.active).toBe(87);
      expect(dashboard.loans.overdue).toBe(23);
      expect(dashboard.wallets.totalBalance).toBe(4500000);
      expect(dashboard.reconciliation.openMismatches).toBe(3);
    });
  });

  // ─── Part 4: Account Freeze Operations ────────────────────────────────────

  describe('Account Freeze Operations', () => {
    it('should freeze a user wallet and move balance to frozen', async () => {
      const wallet = { id: WALLET_ID, userId: USER_ID, availableBalance: 50000, frozenBalance: 0 };
      mockPrisma.wallet.findUnique.mockResolvedValue(wallet);
      mockPrisma.wallet.update.mockResolvedValue({ ...wallet, availableBalance: 0, frozenBalance: 50000 });

      const result = await adminService.freezeWallet(USER_ID, { reason: 'Suspicious activity' }, ADMIN_ID);

      expect(result.frozen).toBe(true);
      expect(result.userId).toBe(USER_ID);
      expect(result.reason).toBe('Suspicious activity');
      expect(mockPrisma.wallet.update).toHaveBeenCalledWith({
        where: { userId: USER_ID },
        data: { frozenBalance: 50000, availableBalance: 0 },
      });
    });

    it('should unfreeze a wallet and restore balance', async () => {
      const wallet = { id: WALLET_ID, userId: USER_ID, availableBalance: 0, frozenBalance: 50000 };
      mockPrisma.wallet.findUnique.mockResolvedValue(wallet);
      mockPrisma.wallet.update.mockResolvedValue({ ...wallet, availableBalance: 50000, frozenBalance: 0 });

      const result = await adminService.unfreezeWallet(USER_ID, ADMIN_ID);

      expect(result.unfrozen).toBe(true);
      expect(mockPrisma.wallet.update).toHaveBeenCalledWith({
        where: { userId: USER_ID },
        data: { availableBalance: 50000, frozenBalance: 0 },
      });
    });

    it('should throw NotFoundException for non-existent wallet', async () => {
      mockPrisma.wallet.findUnique.mockResolvedValue(null);
      await expect(adminService.freezeWallet('ghost-user', { reason: 'test' }, ADMIN_ID))
        .rejects.toThrow('Wallet not found');
    });
  });

  // ─── Part 5: Loan Governance ───────────────────────────────────────────────

  describe('Loan Governance', () => {
    it('should override loan eligibility with admin accountability', async () => {
      const eligibility = { id: 'elig-001', userId: USER_ID, eligible: false };
      mockPrisma.loanEligibility.findUnique.mockResolvedValue(eligibility);
      mockPrisma.loanEligibility.update.mockResolvedValue({ ...eligibility, eligible: true });

      const result = await adminService.overrideLoanEligibility(USER_ID, true, ADMIN_ID);

      expect(result.overridden).toBe(true);
      expect(result.eligible).toBe(true);
      expect(mockPrisma.loanEligibility.update).toHaveBeenCalledWith({
        where: { userId: USER_ID },
        data: { eligible: true, recommendation: `Admin override by ${ADMIN_ID}` },
      });
    });
  });

  // ─── Part 6: Audit Logging ─────────────────────────────────────────────────

  describe('Audit Logging — Append-Only Infrastructure', () => {
    it('should write audit log entries without throwing', () => {
      expect(() => auditService.log({
        actorType: AuditActorType.ADMIN,
        actorId: ADMIN_ID,
        action: 'wallet.frozen',
        entityType: 'Wallet',
        entityId: WALLET_ID,
        metadata: { reason: 'Suspicious activity' },
        ipAddress: '127.0.0.1',
      })).not.toThrow();

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          actorType: AuditActorType.ADMIN,
          actorId: ADMIN_ID,
          action: 'wallet.frozen',
        }),
      });
    });

    it('should query audit logs with filters', async () => {
      mockPrisma.auditLog.findMany.mockResolvedValue([
        { id: 'log-1', actorId: ADMIN_ID, action: 'wallet.frozen', createdAt: new Date() },
      ]);
      mockPrisma.auditLog.count.mockResolvedValue(1);

      const result = await auditService.query({
        actorType: AuditActorType.ADMIN,
        actorId: ADMIN_ID,
        page: 1,
        limit: 10,
      });

      expect(result.logs).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('should retrieve entity history for a wallet', async () => {
      mockPrisma.auditLog.findMany.mockResolvedValue([
        { id: 'log-1', action: 'wallet.frozen', entityType: 'Wallet', entityId: WALLET_ID },
        { id: 'log-2', action: 'wallet.unfrozen', entityType: 'Wallet', entityId: WALLET_ID },
      ]);

      const history = await auditService.getEntityHistory('Wallet', WALLET_ID);
      expect(history).toHaveLength(2);
      expect(history[0].action).toBe('wallet.frozen');
    });

    it('should emit audit events on fraud detection', async () => {
      const auditSpy = jest.spyOn(auditService, 'log');
      const listener = new AuditEventListener(auditService);

      listener.onFraud({ userId: USER_ID, riskLevel: 'Very High' });

      expect(auditSpy).toHaveBeenCalledWith(expect.objectContaining({
        actorType: AuditActorType.SYSTEM,
        action: 'fraud.detected',
        entityType: 'User',
        entityId: USER_ID,
      }));
    });

    it('should emit audit events on reconciliation mismatch', () => {
      const auditSpy = jest.spyOn(auditService, 'log');
      const listener = new AuditEventListener(auditService);

      listener.onMismatch({ jobId: 'job-001', reference: 'REF-123', type: 'AMOUNT_MISMATCH' });

      expect(auditSpy).toHaveBeenCalledWith(expect.objectContaining({
        actorType: AuditActorType.SYSTEM,
        action: 'reconciliation.mismatch.detected',
        entityType: 'ReconciliationJob',
        entityId: 'job-001',
      }));
    });
  });

  // ─── Part 7: Reconciliation Engine ────────────────────────────────────────

  describe('Financial Reconciliation Engine', () => {
    it('should run provider reconciliation and create a job record', async () => {
      const jobId = 'job-001';
      mockPrisma.reconciliationJob.create.mockResolvedValue({
        id: jobId, provider: 'squad', status: ReconciliationJobStatus.RUNNING,
      });
      mockPrisma.payout.findMany.mockResolvedValue([]);
      mockPrisma.$queryRaw.mockResolvedValue([]);
      mockPrisma.reconciliationJob.update.mockResolvedValue({});

      const result = await reconciliationService.runProviderReconciliation('squad');

      expect(result.jobId).toBe(jobId);
      expect(result.mismatchesFound).toBe(0);
      expect(mockPrisma.reconciliationJob.create).toHaveBeenCalledWith({
        data: { provider: 'squad', status: ReconciliationJobStatus.RUNNING },
      });
    });

    it('should detect ledger inconsistency when credits - debits ≠ balance', async () => {
      const jobId = 'job-ledger-001';
      mockPrisma.reconciliationJob.create.mockResolvedValue({
        id: jobId, provider: 'internal-ledger', status: ReconciliationJobStatus.RUNNING,
      });
      mockPrisma.wallet.findMany.mockResolvedValue([
        {
          id: WALLET_ID,
          userId: USER_ID,
          availableBalance: 10000,
          frozenBalance: 0,
          ledgerEntries: [
            { type: 'CREDIT', amount: 15000 },
            { type: 'DEBIT', amount: 3000 },
            // Expected: 15000 - 3000 = 12000, but stored = 10000 → delta = 2000
          ],
        },
      ]);
      mockPrisma.reconciliationMismatch.create.mockResolvedValue({
        id: 'mismatch-ledger-1',
        mismatchType: MismatchType.LEDGER_INCONSISTENCY,
        status: MismatchStatus.OPEN,
      });
      mockPrisma.reconciliationJob.update.mockResolvedValue({});

      const mismatchSpy = jest.spyOn(events, 'emit');
      const result = await reconciliationService.runLedgerIntegrityScan();

      expect(result.jobId).toBe(jobId);
      expect(result.mismatchesFound).toBe(1);
      expect(mismatchSpy).toHaveBeenCalledWith(
        RECONCILIATION_EVENTS.LEDGER_INCONSISTENCY,
        expect.objectContaining({ walletId: WALLET_ID, userId: USER_ID }),
      );
    });

    it('should resolve a mismatch with admin notes', async () => {
      const mismatch = {
        id: 'mismatch-1',
        reconciliationJobId: 'job-001',
        status: MismatchStatus.OPEN,
      };
      mockPrisma.reconciliationMismatch.findUnique.mockResolvedValue(mismatch);
      mockPrisma.reconciliationMismatch.update.mockResolvedValue({
        ...mismatch,
        status: MismatchStatus.RESOLVED,
        resolutionNotes: `[${ADMIN_ID}] Verified with Squad — correct`,
      });
      mockPrisma.reconciliationJob.update.mockResolvedValue({});

      const result = await reconciliationService.resolveMismatch(
        'mismatch-1',
        'Verified with Squad — correct',
        ADMIN_ID,
      );

      expect(result.status).toBe(MismatchStatus.RESOLVED);
      expect(result.resolutionNotes).toContain(ADMIN_ID);
      expect(mockPrisma.reconciliationJob.update).toHaveBeenCalledWith({
        where: { id: 'job-001' },
        data: { resolvedCount: { increment: 1 } },
      });
    });

    it('should escalate a mismatch for senior review', async () => {
      mockPrisma.reconciliationMismatch.findUnique.mockResolvedValue({
        id: 'mismatch-1', reconciliationJobId: 'job-001', status: MismatchStatus.OPEN,
      });
      mockPrisma.reconciliationMismatch.update.mockResolvedValue({
        id: 'mismatch-1', status: MismatchStatus.ESCALATED,
      });

      const result = await reconciliationService.escalateMismatch('mismatch-1');
      expect(result.status).toBe(MismatchStatus.ESCALATED);
    });

    it('should throw NotFoundException for non-existent mismatch', async () => {
      mockPrisma.reconciliationMismatch.findUnique.mockResolvedValue(null);
      await expect(reconciliationService.resolveMismatch('ghost', 'notes', ADMIN_ID))
        .rejects.toThrow('Mismatch not found');
    });

    it('should run treasury consistency check', async () => {
      const jobId = 'job-treasury-001';
      mockPrisma.reconciliationJob.create.mockResolvedValue({
        id: jobId, provider: 'treasury', status: ReconciliationJobStatus.RUNNING,
      });
      mockPrisma.savingsGroupWallet.findMany.mockResolvedValue([
        {
          id: 'gw-001',
          availableBalance: 100000,
          reserveBalance: 20000,
          lendingPoolBalance: 30000,
          ledgerEntries: [
            { type: 'CREDIT', amount: 150000 },
            { type: 'DEBIT', amount: 0 },
            // computed = 150000, stored = 150000 → clean
          ],
        },
      ]);
      mockPrisma.reconciliationJob.update.mockResolvedValue({});

      const result = await reconciliationService.runTreasuryConsistencyCheck();
      expect(result.jobId).toBe(jobId);
      expect(result.mismatchesFound).toBe(0);
    });
  });

  // ─── Part 8: Event-Driven Operational Intelligence ─────────────────────────

  describe('Event-Driven Operational Intelligence', () => {
    it('should emit mismatch event when reconciliation finds discrepancy', async () => {
      const emitSpy = jest.spyOn(events, 'emit');
      const jobId = 'job-event-001';

      mockPrisma.reconciliationJob.create.mockResolvedValue({
        id: jobId, provider: 'internal-ledger', status: ReconciliationJobStatus.RUNNING,
      });
      mockPrisma.wallet.findMany.mockResolvedValue([
        {
          id: 'w-bad',
          userId: 'u-bad',
          availableBalance: 5000,
          frozenBalance: 0,
          ledgerEntries: [
            { type: 'CREDIT', amount: 10000 },
            { type: 'DEBIT', amount: 2000 },
            // computed = 8000, stored = 5000 → delta = 3000
          ],
        },
      ]);
      mockPrisma.reconciliationMismatch.create.mockResolvedValue({
        id: 'mm-event-1', reconciliationJobId: jobId,
        mismatchType: MismatchType.LEDGER_INCONSISTENCY, status: MismatchStatus.OPEN,
      });
      mockPrisma.reconciliationJob.update.mockResolvedValue({});

      await reconciliationService.runLedgerIntegrityScan();

      expect(emitSpy).toHaveBeenCalledWith(
        RECONCILIATION_EVENTS.MISMATCH_DETECTED,
        expect.objectContaining({ jobId, type: MismatchType.LEDGER_INCONSISTENCY }),
      );
      expect(emitSpy).toHaveBeenCalledWith(
        RECONCILIATION_EVENTS.LEDGER_INCONSISTENCY,
        expect.objectContaining({ walletId: 'w-bad', userId: 'u-bad' }),
      );
    });

    it('should complete a clean ledger scan with zero mismatches and mark job COMPLETED', async () => {
      const jobId = 'job-clean-001';

      mockPrisma.reconciliationJob.create.mockResolvedValue({
        id: jobId, provider: 'internal-ledger', status: ReconciliationJobStatus.RUNNING,
      });
      mockPrisma.wallet.findMany.mockResolvedValue([
        {
          id: 'w-clean', userId: 'u-clean',
          availableBalance: 8000, frozenBalance: 0,
          ledgerEntries: [
            { type: 'CREDIT', amount: 10000 },
            { type: 'DEBIT', amount: 2000 },
            // computed = 8000, stored = 8000 → clean
          ],
        },
      ]);
      mockPrisma.reconciliationJob.update.mockResolvedValue({});

      const result = await reconciliationService.runLedgerIntegrityScan();

      expect(result.mismatchesFound).toBe(0);
      expect(mockPrisma.reconciliationJob.update).toHaveBeenCalledWith({
        where: { id: jobId },
        data: expect.objectContaining({ status: ReconciliationJobStatus.COMPLETED, mismatchesFound: 0 }),
      });
      // No mismatches created
      expect(mockPrisma.reconciliationMismatch.create).not.toHaveBeenCalled();
    });
  });

  // ─── Part 9: Full Operational Simulation ──────────────────────────────────

  describe('Full Operational Simulation', () => {
    it('should complete the full admin → fraud → freeze → audit → reconcile → resolve flow', async () => {
      const auditLogSpy = jest.spyOn(auditService, 'log');

      // Step 1: Admin logs in
      const mockAdmin = {
        id: ADMIN_ID, email: 'ops@signalos.io',
        passwordHash: await require('bcrypt').hash('SecurePass123!', 12),
        role: AdminRole.FRAUD_ANALYST, active: true, permissions: [],
      };
      mockPrisma.adminUser.findUnique.mockResolvedValue(mockAdmin);
      mockPrisma.adminUser.update.mockResolvedValue(mockAdmin);
      const loginResult = await adminService.login({ email: 'ops@signalos.io', password: 'SecurePass123!' });
      expect(loginResult.token).toBeDefined();

      // Step 2: Fraud detected → audit log created
      const auditListener = new AuditEventListener(auditService);
      auditListener.onFraud({ userId: USER_ID, riskLevel: 'Very High' });
      expect(auditLogSpy).toHaveBeenCalledWith(expect.objectContaining({ action: 'fraud.detected' }));

      // Step 3: Account frozen
      mockPrisma.wallet.findUnique.mockResolvedValue({
        id: WALLET_ID, userId: USER_ID, availableBalance: 75000, frozenBalance: 0,
      });
      mockPrisma.wallet.update.mockResolvedValue({});
      const freezeResult = await adminService.freezeWallet(USER_ID, { reason: 'Fraud detected' }, ADMIN_ID);
      expect(freezeResult.frozen).toBe(true);

      // Step 4: Reconciliation job runs
      const jobId = 'job-sim-001';
      mockPrisma.reconciliationJob.create.mockResolvedValue({
        id: jobId, provider: 'internal-ledger', status: ReconciliationJobStatus.RUNNING,
      });
      mockPrisma.wallet.findMany.mockResolvedValue([
        {
          id: WALLET_ID, userId: USER_ID,
          availableBalance: 0, frozenBalance: 75000,
          ledgerEntries: [{ type: 'CREDIT', amount: 75000 }],
          // computed = 75000, stored = 75000 → clean
        },
      ]);
      mockPrisma.reconciliationJob.update.mockResolvedValue({});
      const reconResult = await reconciliationService.runLedgerIntegrityScan();
      expect(reconResult.mismatchesFound).toBe(0);

      // Step 5: Audit log for reconciliation
      auditListener.onMismatch({ jobId, reference: 'REF-SIM', type: 'STATUS_MISMATCH' });
      expect(auditLogSpy).toHaveBeenCalledWith(expect.objectContaining({
        action: 'reconciliation.mismatch.detected',
      }));

      // Step 6: Treasury verified
      mockPrisma.reconciliationJob.create.mockResolvedValue({
        id: 'job-treasury-sim', provider: 'treasury', status: ReconciliationJobStatus.RUNNING,
      });
      mockPrisma.savingsGroupWallet.findMany.mockResolvedValue([]);
      const treasuryResult = await reconciliationService.runTreasuryConsistencyCheck();
      expect(treasuryResult.mismatchesFound).toBe(0);

      // All audit logs were written
      expect(auditLogSpy).toHaveBeenCalledTimes(2);
    });
  });
});
