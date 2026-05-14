/**
 * Phase 1 — Repayment Lifecycle Integration Spec
 *
 * Simulates the full repayment lifecycle:
 * 1. Loan disbursed → schedule generated
 * 2. Repayment processed → wallet debited, treasury credited, trust recalculated
 * 3. Overdue detection → penalty applied, trust degraded
 * 4. Default detection → loan marked defaulted
 * 5. Repayment intelligence computed
 * 6. Notifications triggered on events
 */

import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { RepaymentService, REPAYMENT_EVENTS } from './repayment.service';
import { RepaymentInterval } from './dto/repayment.dto';
import { DisbursementStatus, RepaymentScheduleStatus } from '@prisma/client';

// ─── Minimal Prisma mock ──────────────────────────────────────────────────────

let seq = 0;
const uid = () => `id_${++seq}`;

const schedules = new Map<string, any>();
const repayments = new Map<string, any>();
const loans = new Map<string, any>();
const wallets = new Map<string, any>();
const ledger = new Map<string, any>();

const prismaMock = {
  loanRepaymentSchedule: {
    findFirst: jest.fn(({ where }) => {
      const match = [...schedules.values()].find((s) => {
        if (where.loanId && s.loanId !== where.loanId) return false;
        if (where.status?.in && !where.status.in.includes(s.status)) return false;
        if (where.status?.notIn && where.status.notIn.includes(s.status)) return false;
        if (where.status && typeof where.status === 'string' && s.status !== where.status) return false;
        if (where.dueDate?.lt && s.dueDate >= where.dueDate.lt) return false;
        return true;
      });
      return Promise.resolve(match ?? null);
    }),
    findMany: jest.fn(({ where, orderBy }) => {
      let result = [...schedules.values()].filter((s) => {
        if (where?.loanId && s.loanId !== where.loanId) return false;
        if (where?.status?.in && !where.status.in.includes(s.status)) return false;
        if (where?.status?.notIn && where.status.notIn.includes(s.status)) return false;
        if (where?.status && typeof where.status === 'string' && s.status !== where.status) return false;
        if (where?.dueDate?.lt && s.dueDate >= where.dueDate.lt) return false;
        return true;
      });
      if (orderBy?.installmentNumber === 'asc') result.sort((a, b) => a.installmentNumber - b.installmentNumber);
      return Promise.resolve(result);
    }),
    findUnique: jest.fn(({ where }) => Promise.resolve(schedules.get(where.id) ?? null)),
    createMany: jest.fn(({ data }) => {
      data.forEach((d: any) => {
        const s = { id: uid(), status: RepaymentScheduleStatus.PENDING, penaltyAmount: 0, paidAt: null, ...d, createdAt: new Date(), updatedAt: new Date() };
        schedules.set(s.id, s);
      });
      return Promise.resolve({ count: data.length });
    }),
    update: jest.fn(({ where, data }) => {
      const s = schedules.get(where.id);
      if (s) Object.assign(s, data, { updatedAt: new Date() });
      return Promise.resolve(s);
    }),
    count: jest.fn(({ where }) => {
      const count = [...schedules.values()].filter((s) => {
        if (where?.loanId?.in && !where.loanId.in.includes(s.loanId)) return false;
        if (where?.loanId && typeof where.loanId === 'string' && s.loanId !== where.loanId) return false;
        if (where?.status?.notIn && where.status.notIn.includes(s.status)) return false;
        if (where?.status?.in && !where.status.in.includes(s.status)) return false;
        if (where?.status && typeof where.status === 'string' && s.status !== where.status) return false;
        return true;
      }).length;
      return Promise.resolve(count);
    }),
  },
  loanRepayment: {
    findFirst: jest.fn(({ where }) => {
      const match = [...repayments.values()].find((r) =>
        r.repaymentScheduleId === where.repaymentScheduleId && r.amountPaid === where.amountPaid,
      );
      return Promise.resolve(match ?? null);
    }),
    create: jest.fn(({ data }) => {
      const r = { id: uid(), ...data, createdAt: new Date() };
      repayments.set(r.id, r);
      return Promise.resolve(r);
    }),
    findMany: jest.fn(({ where }) =>
      Promise.resolve([...repayments.values()].filter((r) => r.loanId === where.loanId)),
    ),
    count: jest.fn(() => Promise.resolve(repayments.size)),
  },
  loanDisbursement: {
    findFirst: jest.fn(({ where }) => {
      const match = [...loans.values()].find((l) => {
        if (where.id && l.id !== where.id) return false;
        if (where.userId && l.userId !== where.userId) return false;
        if (where.status && l.status !== where.status) return false;
        return true;
      });
      return Promise.resolve(match ?? null);
    }),
    findUnique: jest.fn(({ where }) => Promise.resolve(loans.get(where.id) ?? null)),
    findMany: jest.fn(({ where }) =>
      Promise.resolve([...loans.values()].filter((l) => !where?.userId || l.userId === where.userId)),
    ),
    update: jest.fn(({ where, data }) => {
      const l = loans.get(where.id);
      if (l) Object.assign(l, data);
      return Promise.resolve(l);
    }),
    updateMany: jest.fn(({ where, data }) => {
      [...loans.values()].filter((l) => l.id === where.id && l.status === where.status).forEach((l) => Object.assign(l, data));
      return Promise.resolve({ count: 1 });
    }),
  },
  wallet: {
    findUnique: jest.fn(({ where }) => {
      const w = where.userId ? [...wallets.values()].find((w) => w.userId === where.userId) : wallets.get(where.id);
      return Promise.resolve(w ?? null);
    }),
    update: jest.fn(({ where, data }) => {
      const w = where.userId ? [...wallets.values()].find((w) => w.userId === where.userId) : wallets.get(where.id);
      if (w) {
        if (data.availableBalance !== undefined && typeof data.availableBalance === 'number') w.availableBalance = data.availableBalance;
        if (data.availableBalance?.decrement !== undefined) w.availableBalance = (w.availableBalance ?? 0) - data.availableBalance.decrement;
        if (data.availableBalance?.increment !== undefined) w.availableBalance = (w.availableBalance ?? 0) + data.availableBalance.increment;
        if (data.totalDebits?.increment !== undefined) w.totalDebits = (w.totalDebits ?? 0) + data.totalDebits.increment;
      }
      return Promise.resolve(w);
    }),
  },
  ledgerEntry: {
    create: jest.fn(({ data }) => {
      const e = { id: uid(), ...data, createdAt: new Date() };
      ledger.set(e.id, e);
      return Promise.resolve(e);
    }),
    findUnique: jest.fn(() => Promise.resolve(null)),
  },
  $transaction: jest.fn(async (fn) => fn(prismaMock)),
};

const walletMock = {
  getWallet: jest.fn((userId: string) => {
    const w = [...wallets.values()].find((w) => w.userId === userId);
    if (!w) throw new Error('Wallet not found');
    return Promise.resolve(w);
  }),
};

// ─── Test suite ───────────────────────────────────────────────────────────────

describe('Phase 1 — Repayment Lifecycle', () => {
  let svc: RepaymentService;
  let emitter: EventEmitter2;

  const LOAN_ID = 'loan_001';
  const USER_ID = 'user_001';
  const WALLET_ID = 'wallet_001';

  beforeAll(async () => {
    schedules.clear(); repayments.clear(); loans.clear(); wallets.clear(); ledger.clear();

    // Seed loan
    loans.set(LOAN_ID, { id: LOAN_ID, userId: USER_ID, walletId: WALLET_ID, amount: 120_000, status: DisbursementStatus.DISBURSED });
    // Seed wallet with sufficient balance
    wallets.set(WALLET_ID, { id: WALLET_ID, userId: USER_ID, availableBalance: 200_000, totalDebits: 0 });

    emitter = new EventEmitter2();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RepaymentService,
        { provide: 'PrismaService', useValue: prismaMock },
        { provide: 'WalletService', useValue: walletMock },
        { provide: EventEmitter2, useValue: emitter },
      ],
    })
      .overrideProvider(RepaymentService)
      .useFactory({ factory: () => new RepaymentService(prismaMock as any, walletMock as any, emitter) })
      .compile();

    svc = module.get(RepaymentService);
  });

  // ── 1. Schedule generation ──────────────────────────────────────────────────

  it('generates 6 monthly installments for ₦120,000 loan', async () => {
    const result = await svc.generateSchedule({
      loanId: LOAN_ID,
      principal: 120_000,
      installments: 6,
      interval: RepaymentInterval.MONTHLY,
    });

    expect(result.count).toBe(6);
    const all = await svc.getSchedule(LOAN_ID);
    expect(all).toHaveLength(6);
    expect(all[0].installmentNumber).toBe(1);
    expect(all[5].installmentNumber).toBe(6);

    // Each installment ≈ ₦20,000 (no interest)
    all.forEach((s) => {
      expect(s.amountDue).toBeCloseTo(20_000, -2);
      expect(s.status).toBe(RepaymentScheduleStatus.PENDING);
    });
  });

  it('rejects duplicate schedule generation', async () => {
    await expect(
      svc.generateSchedule({ loanId: LOAN_ID, principal: 120_000, installments: 6, interval: RepaymentInterval.MONTHLY }),
    ).rejects.toThrow('Repayment schedule already exists');
  });

  it('generates weekly schedule correctly', async () => {
    const weeklyLoanId = 'loan_weekly';
    loans.set(weeklyLoanId, { id: weeklyLoanId, userId: USER_ID, walletId: WALLET_ID, amount: 40_000, status: DisbursementStatus.DISBURSED });

    const result = await svc.generateSchedule({
      loanId: weeklyLoanId,
      principal: 40_000,
      installments: 4,
      interval: RepaymentInterval.WEEKLY,
    });
    expect(result.count).toBe(4);

    const all = await svc.getSchedule(weeklyLoanId);
    // Weekly: each due date ~7 days apart
    const diff = all[1].dueDate.getTime() - all[0].dueDate.getTime();
    expect(diff).toBeCloseTo(7 * 86400000, -5);
  });

  it('applies interest correctly when rate provided', async () => {
    const interestLoanId = 'loan_interest';
    loans.set(interestLoanId, { id: interestLoanId, userId: USER_ID, walletId: WALLET_ID, amount: 120_000, status: DisbursementStatus.DISBURSED });

    await svc.generateSchedule({
      loanId: interestLoanId,
      principal: 120_000,
      installments: 6,
      interval: RepaymentInterval.MONTHLY,
      annualInterestRate: 12,
    });

    const all = await svc.getSchedule(interestLoanId);
    // With 12% annual (1%/month), installment > ₦20,000
    expect(all[0].amountDue).toBeGreaterThan(20_000);
  });

  // ── 2. Repayment processing ─────────────────────────────────────────────────

  it('processes a repayment: debits wallet, creates repayment record, updates schedule', async () => {
    const emittedEvents: string[] = [];
    emitter.on(REPAYMENT_EVENTS.CREATED, () => emittedEvents.push('created'));
    emitter.on(REPAYMENT_EVENTS.COMPLETED, () => emittedEvents.push('completed'));

    const result = await svc.processRepayment(USER_ID, { loanId: LOAN_ID, amount: 20_000 });

    expect(result.success).toBe(true);
    expect(result.reference).toMatch(/^repay_/);
    expect(result.isPaid).toBe(true);

    // Wallet debited
    const wallet = wallets.get(WALLET_ID);
    expect(wallet.availableBalance).toBe(180_000); // 200k - 20k

    // Repayment record created
    const history = await svc.getRepaymentHistory(LOAN_ID);
    expect(history.length).toBeGreaterThan(0);
    expect(history[0].amountPaid).toBe(20_000);

    // Schedule marked PAID
    const schedule = [...schedules.values()].find((s) => s.loanId === LOAN_ID && s.status === RepaymentScheduleStatus.PAID);
    expect(schedule).toBeDefined();

    // Events emitted
    expect(emittedEvents).toContain('created');
    expect(emittedEvents).toContain('completed');
  });

  it('rejects repayment with insufficient balance', async () => {
    // Drain wallet
    const wallet = wallets.get(WALLET_ID);
    wallet.availableBalance = 100;

    await expect(
      svc.processRepayment(USER_ID, { loanId: LOAN_ID, amount: 20_000 }),
    ).rejects.toThrow('Insufficient balance');

    // Restore
    wallet.availableBalance = 180_000;
  });

  it('rejects repayment for non-existent loan', async () => {
    await expect(
      svc.processRepayment(USER_ID, { loanId: 'fake_loan', amount: 20_000 }),
    ).rejects.toThrow('Active loan not found');
  });

  // ── 3. Outstanding balance ──────────────────────────────────────────────────

  it('calculates outstanding balance correctly', async () => {
    const balance = await svc.getOutstandingBalance(LOAN_ID);
    // Remaining PENDING schedules
    expect(balance).toBeGreaterThan(0);
  });

  // ── 4. Overdue detection ────────────────────────────────────────────────────

  it('marks overdue schedules and applies penalties', async () => {
    // Backdate a pending schedule past grace period
    const pendingSchedule = [...schedules.values()].find((s) => s.loanId === LOAN_ID && s.status === RepaymentScheduleStatus.PENDING);
    if (pendingSchedule) {
      pendingSchedule.dueDate = new Date(Date.now() - 10 * 86400000); // 10 days ago
    }

    const overdueEvents: any[] = [];
    emitter.on(REPAYMENT_EVENTS.OVERDUE, (p) => overdueEvents.push(p));

    const count = await svc.detectAndMarkOverdue();
    expect(count).toBeGreaterThan(0);

    // Check penalty applied
    const overdue = [...schedules.values()].find((s) => s.status === RepaymentScheduleStatus.OVERDUE);
    expect(overdue).toBeDefined();
    expect(overdue.penaltyAmount).toBeGreaterThan(0);

    // Event emitted
    expect(overdueEvents.length).toBeGreaterThan(0);
    expect(overdueEvents[0].daysOverdue).toBeGreaterThan(0);
  });

  // ── 5. Default detection ────────────────────────────────────────────────────

  it('detects and marks defaulted loans', async () => {
    // Backdate overdue schedule past default threshold
    const overdueSchedule = [...schedules.values()].find((s) => s.status === RepaymentScheduleStatus.OVERDUE);
    if (overdueSchedule) {
      overdueSchedule.dueDate = new Date(Date.now() - 95 * 86400000); // 95 days ago
    }

    const defaultEvents: string[] = [];
    emitter.on(REPAYMENT_EVENTS.DEFAULT_DETECTED, () => defaultEvents.push('default'));

    const count = await svc.detectDefaults();
    expect(count).toBeGreaterThan(0);
    expect(defaultEvents).toContain('default');
  });

  // ── 6. Repayment intelligence ───────────────────────────────────────────────

  it('computes repayment intelligence correctly', async () => {
    const intel = await svc.getRepaymentIntelligence(USER_ID);

    expect(intel.totalInstallments).toBeGreaterThan(0);
    expect(intel.paidInstallments).toBeGreaterThanOrEqual(0);
    expect(intel.repaymentRate).toBeGreaterThanOrEqual(0);
    expect(intel.repaymentRate).toBeLessThanOrEqual(1);
    expect(['EXCELLENT', 'GOOD', 'FAIR', 'POOR']).toContain(intel.repaymentReliability);
  });

  it('returns EXCELLENT reliability for perfect repayment', async () => {
    // Mark ALL schedules for all user loans as PAID
    [...schedules.values()].forEach((s) => (s.status = RepaymentScheduleStatus.PAID));

    const intel = await svc.getRepaymentIntelligence(USER_ID);
    expect(intel.repaymentReliability).toBe('EXCELLENT');
    expect(intel.repaymentRate).toBe(1);
  });

  // ── 7. Partial repayment ────────────────────────────────────────────────────

  it('handles partial repayment correctly', async () => {
    const partialLoanId = 'loan_partial';
    loans.set(partialLoanId, { id: partialLoanId, userId: USER_ID, walletId: WALLET_ID, amount: 60_000, status: DisbursementStatus.DISBURSED });

    await svc.generateSchedule({ loanId: partialLoanId, principal: 60_000, installments: 3, interval: RepaymentInterval.MONTHLY });

    const result = await svc.processRepayment(USER_ID, { loanId: partialLoanId, amount: 5_000 }); // partial: due is ₦20k
    expect(result.isPartial).toBe(true);
    expect(result.isPaid).toBe(false);

    const schedule = [...schedules.values()].find((s) => s.loanId === partialLoanId && s.status === RepaymentScheduleStatus.PARTIAL);
    expect(schedule).toBeDefined();
  });
});
