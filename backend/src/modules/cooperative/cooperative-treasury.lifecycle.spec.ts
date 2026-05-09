/**
 * Cooperative Treasury — Full Lifecycle Integration Tests
 *
 * Simulates the complete cooperative banking lifecycle:
 * Group created → wallet initialized → members contribute → treasury grows
 * → loan disbursed → treasury debited → repayment → treasury replenished
 * → intelligence recalculates
 */

import { GroupLedgerService } from '../cooperative/group-ledger.service';
import { GroupWalletService } from '../cooperative/group-wallet.service';
import { CooperativeTreasuryService } from '../cooperative/cooperative-treasury.service';
import { GroupLoanService } from '../cooperative/group-loan.service';
import { GroupLedgerCategory, GroupLoanStatus, LedgerDirection, LedgerEntryType, LedgerStatus } from '@prisma/client';

// ─── Shared mock factory ──────────────────────────────────────────────────────

function makePrismaMock() {
  const wallet = {
    id: 'gw_1',
    groupId: 'group_1',
    availableBalance: 0,
    reserveBalance: 0,
    lendingPoolBalance: 0,
    totalContributions: 0,
    totalLoansIssued: 0,
    totalWithdrawals: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  return {
    _wallet: wallet,
    savingsGroupWallet: {
      findUnique: jest.fn().mockImplementation(({ where }) => {
        if (where.groupId === wallet.groupId || where.id === wallet.id) return Promise.resolve({ ...wallet });
        return Promise.resolve(null);
      }),
      create: jest.fn().mockResolvedValue({ ...wallet }),
      update: jest.fn().mockImplementation(({ data }) => {
        if (data.availableBalance?.increment) wallet.availableBalance += data.availableBalance.increment;
        if (data.availableBalance?.decrement) wallet.availableBalance -= data.availableBalance.decrement;
        if (data.reserveBalance?.increment) wallet.reserveBalance += data.reserveBalance.increment;
        if (data.lendingPoolBalance?.increment) wallet.lendingPoolBalance += data.lendingPoolBalance.increment;
        if (data.lendingPoolBalance?.decrement) wallet.lendingPoolBalance -= data.lendingPoolBalance.decrement;
        if (data.totalContributions?.increment) wallet.totalContributions += data.totalContributions.increment;
        if (data.totalLoansIssued?.increment) wallet.totalLoansIssued += data.totalLoansIssued.increment;
        return Promise.resolve({ ...wallet });
      }),
    },
    groupLedgerEntry: {
      create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: `le_${Date.now()}`, ...data })),
      findUnique: jest.fn().mockResolvedValue(null),
      findMany: jest.fn().mockResolvedValue([]),
    },
    groupLoan: {
      create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: `loan_${Date.now()}`, ...data })),
      findUnique: jest.fn(),
      findFirst: jest.fn().mockResolvedValue(null),
      findMany: jest.fn().mockResolvedValue([]),
      update: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'loan_1', ...data })),
      count: jest.fn().mockResolvedValue(0),
    },
    groupMember: {
      findUnique: jest.fn().mockResolvedValue({ id: 'gm_1', userId: 'user_1', groupId: 'group_1' }),
      count: jest.fn().mockResolvedValue(5),
    },
    contribution: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    groupEconomicProfile: {
      findUnique: jest.fn().mockResolvedValue(null),
      upsert: jest.fn().mockResolvedValue({ groupId: 'group_1', sustainabilityScore: 75 }),
    },
    treasurySnapshot: {
      create: jest.fn().mockResolvedValue({ id: 'snap_1' }),
    },
    wallet: {
      findUnique: jest.fn().mockResolvedValue({ id: 'w_1', userId: 'user_1', availableBalance: 50000, totalCredits: 0, totalDebits: 0 }),
      update: jest.fn().mockResolvedValue({}),
    },
    ledgerEntry: {
      create: jest.fn().mockResolvedValue({ id: 'le_user_1' }),
    },
    $transaction: jest.fn().mockImplementation((fn) => fn({
      savingsGroupWallet: {
        findUnique: jest.fn().mockResolvedValue({ id: 'gw_1', groupId: 'group_1', availableBalance: 8000, reserveBalance: 2000, lendingPoolBalance: 4000, totalContributions: 10000, totalLoansIssued: 0 }),
        update: jest.fn().mockResolvedValue({}),
      },
      groupLedgerEntry: { create: jest.fn().mockResolvedValue({ id: 'le_1' }) },
      groupLoan: {
        create: jest.fn().mockResolvedValue({ id: 'loan_1', groupId: 'group_1', borrowerId: 'user_1', amount: 3000, status: GroupLoanStatus.DISBURSED }),
        update: jest.fn().mockResolvedValue({}),
      },
      wallet: {
        findUnique: jest.fn().mockResolvedValue({ id: 'w_1', availableBalance: 50000 }),
        update: jest.fn().mockResolvedValue({}),
      },
      ledgerEntry: { create: jest.fn().mockResolvedValue({}) },
    })),
  };
}

// ─── GroupLedgerService ───────────────────────────────────────────────────────

describe('GroupLedgerService', () => {
  let service: GroupLedgerService;
  let prisma: ReturnType<typeof makePrismaMock>;

  beforeEach(() => {
    prisma = makePrismaMock();
    service = new GroupLedgerService(prisma as any);
  });

  it('appends a ledger entry with correct fields', async () => {
    const entry = await service.append({
      groupWalletId: 'gw_1',
      type: LedgerEntryType.CREDIT,
      direction: LedgerDirection.CREDIT,
      amount: 10000,
      reference: 'ref_001',
      category: GroupLedgerCategory.MEMBER_CONTRIBUTION,
      balanceBefore: 0,
      balanceAfter: 10000,
      memberId: 'user_1',
    });

    expect(prisma.groupLedgerEntry.create).toHaveBeenCalledTimes(1);
    expect(entry).toMatchObject({
      groupWalletId: 'gw_1',
      amount: 10000,
      category: GroupLedgerCategory.MEMBER_CONTRIBUTION,
      status: LedgerStatus.COMPLETED,
    });
  });

  it('never allows editing — append only', async () => {
    // GroupLedgerService has no update method
    expect((service as any).update).toBeUndefined();
    expect((service as any).delete).toBeUndefined();
  });

  it('returns entry by reference for idempotency', async () => {
    prisma.groupLedgerEntry.findUnique.mockResolvedValueOnce({ id: 'le_1', reference: 'ref_001' });
    const result = await service.getEntryByReference('ref_001');
    expect(result).toMatchObject({ reference: 'ref_001' });
  });

  it('paginates ledger entries', async () => {
    prisma.groupLedgerEntry.findMany.mockResolvedValueOnce([{ id: 'le_1' }, { id: 'le_2' }]);
    const entries = await service.getGroupLedger('gw_1', 10, 0);
    expect(entries).toHaveLength(2);
    expect(prisma.groupLedgerEntry.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 10, skip: 0 }),
    );
  });
});

// ─── GroupWalletService ───────────────────────────────────────────────────────

describe('GroupWalletService', () => {
  let service: GroupWalletService;
  let prisma: ReturnType<typeof makePrismaMock>;
  let events: { emit: jest.Mock };
  let ledger: GroupLedgerService;

  beforeEach(() => {
    prisma = makePrismaMock();
    events = { emit: jest.fn() };
    ledger = new GroupLedgerService(prisma as any);
    service = new GroupWalletService(prisma as any, ledger, events as any);
  });

  it('creates wallet on first getOrCreate', async () => {
    prisma.savingsGroupWallet.findUnique.mockResolvedValueOnce(null);
    const wallet = await service.getOrCreate('group_new');
    expect(prisma.savingsGroupWallet.create).toHaveBeenCalledWith({ data: { groupId: 'group_new' } });
    expect(events.emit).toHaveBeenCalledWith('group.wallet.created', expect.any(Object));
  });

  it('returns existing wallet without creating duplicate', async () => {
    const wallet = await service.getOrCreate('group_1');
    expect(prisma.savingsGroupWallet.create).not.toHaveBeenCalled();
    expect(wallet.groupId).toBe('group_1');
  });

  it('throws NotFoundException for unknown group', async () => {
    prisma.savingsGroupWallet.findUnique.mockResolvedValueOnce(null);
    await expect(service.getWallet('unknown_group')).rejects.toThrow('Group wallet not found');
  });

  it('credits treasury and allocates 80/20 split', async () => {
    // The credit method runs inside $transaction, so we capture the inner tx mock's update call
    const txUpdateMock = jest.fn().mockResolvedValue({});
    prisma.$transaction.mockImplementationOnce((fn: any) =>
      fn({
        savingsGroupWallet: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'gw_1', groupId: 'group_1',
            availableBalance: 0, reserveBalance: 0, lendingPoolBalance: 0,
          }),
          update: txUpdateMock,
        },
        groupLedgerEntry: { create: jest.fn().mockResolvedValue({ id: 'le_1' }) },
      }),
    );

    await service.credit({
      groupId: 'group_1',
      amount: 10000,
      category: GroupLedgerCategory.MEMBER_CONTRIBUTION,
      reference: 'credit_ref_001',
      memberId: 'user_1',
    });

    expect(txUpdateMock).toHaveBeenCalledTimes(1);
    const updateCall = txUpdateMock.mock.calls[0][0];
    expect(updateCall.data.availableBalance.increment).toBe(8000); // 80%
    expect(updateCall.data.reserveBalance.increment).toBe(2000);   // 20%
    expect(updateCall.data.lendingPoolBalance.increment).toBe(4000); // 50% of available
    expect(updateCall.data.totalContributions.increment).toBe(10000);
  });

  it('is idempotent — skips duplicate credit references', async () => {
    prisma.groupLedgerEntry.findUnique.mockResolvedValueOnce({ id: 'le_existing', reference: 'dup_ref' });
    await service.credit({
      groupId: 'group_1',
      amount: 5000,
      category: GroupLedgerCategory.MEMBER_CONTRIBUTION,
      reference: 'dup_ref',
    });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('debits lending pool for loan disbursement', async () => {
    await service.debit({
      groupId: 'group_1',
      amount: 3000,
      category: GroupLedgerCategory.GROUP_LOAN_DISBURSEMENT,
      reference: 'debit_ref_001',
      memberId: 'user_1',
    });
    expect(prisma.$transaction).toHaveBeenCalled();
  });

  it('replenishes treasury on loan repayment', async () => {
    await service.replenish({
      groupId: 'group_1',
      amount: 3000,
      reference: 'repay_ref_001',
      memberId: 'user_1',
    });
    expect(prisma.$transaction).toHaveBeenCalled();
  });
});

// ─── CooperativeTreasuryService ───────────────────────────────────────────────

describe('CooperativeTreasuryService', () => {
  let service: CooperativeTreasuryService;
  let prisma: ReturnType<typeof makePrismaMock>;

  beforeEach(() => {
    prisma = makePrismaMock();
    prisma.savingsGroupWallet.findUnique.mockResolvedValue({
      id: 'gw_1',
      groupId: 'group_1',
      availableBalance: 68000,
      reserveBalance: 17000,
      lendingPoolBalance: 34000,
      totalContributions: 85000,
      totalLoansIssued: 15000,
      totalWithdrawals: 0,
    });
    service = new CooperativeTreasuryService(prisma as any);
  });

  it('returns treasury health with correct reserve ratio', async () => {
    const health = await service.getHealth('group_1');
    expect(health.groupId).toBe('group_1');
    expect(health.treasuryBalance).toBe(85000); // available + reserve
    expect(health.reserveRatio).toBeCloseTo(0.2, 1);
    expect(health.lendingCapacity).toBe(34000);
    expect(health.sustainabilityScore).toBeGreaterThan(50);
    expect(health.sustainabilityScore).toBeLessThanOrEqual(100);
  });

  it('persists a treasury snapshot on health check', async () => {
    await service.getHealth('group_1');
    expect(prisma.treasurySnapshot.create).toHaveBeenCalledTimes(1);
  });

  it('returns zero health for group with no wallet', async () => {
    prisma.savingsGroupWallet.findUnique.mockResolvedValueOnce(null);
    const health = await service.getHealth('no_wallet_group');
    expect(health.treasuryBalance).toBe(0);
    expect(health.sustainabilityScore).toBe(0);
  });

  it('upserts group economic profile on updateGroupProfile', async () => {
    await service.updateGroupProfile('group_1');
    expect(prisma.groupEconomicProfile.upsert).toHaveBeenCalledTimes(1);
    const upsertCall = prisma.groupEconomicProfile.upsert.mock.calls[0][0];
    expect(upsertCall.where).toEqual({ groupId: 'group_1' });
  });

  it('calculates repayment performance from loan history', async () => {
    prisma.groupLoan.findMany.mockResolvedValueOnce([
      { status: GroupLoanStatus.REPAID },
      { status: GroupLoanStatus.REPAID },
      { status: GroupLoanStatus.DISBURSED },
      { status: GroupLoanStatus.DISBURSED },
    ]);
    await service.updateGroupProfile('group_1');
    const upsertCall = prisma.groupEconomicProfile.upsert.mock.calls[0][0];
    expect(upsertCall.create.repaymentPerformance).toBe(50); // 2/4 = 50%
  });

  it('returns group economic profile', async () => {
    prisma.groupEconomicProfile.findUnique.mockResolvedValueOnce({
      groupId: 'group_1',
      sustainabilityScore: 75,
    });
    const profile = await service.getGroupEconomicProfile('group_1');
    expect(profile?.groupId).toBe('group_1');
  });
});

// ─── GroupLoanService ─────────────────────────────────────────────────────────

describe('GroupLoanService', () => {
  let service: GroupLoanService;
  let prisma: ReturnType<typeof makePrismaMock>;
  let groupWallet: GroupWalletService;
  let walletService: { getOrCreate: jest.Mock; credit: jest.Mock; debit: jest.Mock };
  let events: { emit: jest.Mock };

  beforeEach(() => {
    prisma = makePrismaMock();
    events = { emit: jest.fn() };
    const ledger = new GroupLedgerService(prisma as any);
    groupWallet = new GroupWalletService(prisma as any, ledger, events as any);
    walletService = { getOrCreate: jest.fn(), credit: jest.fn(), debit: jest.fn() };
    service = new GroupLoanService(prisma as any, groupWallet, walletService as any, events as any);
  });

  it('disburses a group loan atomically', async () => {
    // getWallet is called first to check pool balance — needs sufficient funds
    prisma.savingsGroupWallet.findUnique.mockResolvedValueOnce({
      id: 'gw_1', groupId: 'group_1',
      availableBalance: 8000, reserveBalance: 2000, lendingPoolBalance: 10000,
      totalContributions: 10000, totalLoansIssued: 0,
    });
    const loan = await service.disburse('group_1', 'user_1', 3000);
    expect(prisma.$transaction).toHaveBeenCalled();
    expect(events.emit).toHaveBeenCalledWith('group.loan.disbursed', expect.objectContaining({
      groupId: 'group_1',
      borrowerId: 'user_1',
      amount: 3000,
    }));
  });

  it('rejects disbursement if borrower is not a member', async () => {
    prisma.groupMember.findUnique.mockResolvedValueOnce(null);
    await expect(service.disburse('group_1', 'outsider', 1000)).rejects.toThrow('Borrower must be a group member');
  });

  it('rejects disbursement if member already has active loan', async () => {
    prisma.groupLoan.findFirst.mockResolvedValueOnce({ id: 'loan_active', status: GroupLoanStatus.DISBURSED });
    await expect(service.disburse('group_1', 'user_1', 1000)).rejects.toThrow('already has an active group loan');
  });

  it('rejects disbursement if lending pool is insufficient', async () => {
    prisma.savingsGroupWallet.findUnique.mockResolvedValueOnce({
      id: 'gw_1', groupId: 'group_1', lendingPoolBalance: 500,
    });
    await expect(service.disburse('group_1', 'user_1', 5000)).rejects.toThrow('Insufficient lending pool');
  });

  it('processes partial repayment correctly', async () => {
    prisma.groupLoan.findUnique.mockResolvedValueOnce({
      id: 'loan_1',
      groupId: 'group_1',
      groupWalletId: 'gw_1',
      borrowerId: 'user_1',
      amount: 3000,
      repaidAmount: 0,
      status: GroupLoanStatus.DISBURSED,
    });

    const result = await service.repay('loan_1', 1500);
    expect(result.repaidAmount).toBe(1500);
    expect(result.fullyRepaid).toBe(false);
    expect(events.emit).toHaveBeenCalledWith('group.loan.repaid', expect.objectContaining({ fullyRepaid: false }));
  });

  it('marks loan as REPAID when fully settled', async () => {
    prisma.groupLoan.findUnique.mockResolvedValueOnce({
      id: 'loan_1',
      groupId: 'group_1',
      groupWalletId: 'gw_1',
      borrowerId: 'user_1',
      amount: 3000,
      repaidAmount: 1500,
      status: GroupLoanStatus.DISBURSED,
    });

    const result = await service.repay('loan_1', 1500);
    expect(result.repaidAmount).toBe(3000);
    expect(result.fullyRepaid).toBe(true);
    expect(events.emit).toHaveBeenCalledWith('group.loan.repaid', expect.objectContaining({ fullyRepaid: true }));
  });

  it('throws NotFoundException for unknown loan', async () => {
    prisma.groupLoan.findUnique.mockResolvedValueOnce(null);
    await expect(service.repay('nonexistent', 1000)).rejects.toThrow('Loan not found');
  });

  it('throws BadRequestException for repayment on non-active loan', async () => {
    prisma.groupLoan.findUnique.mockResolvedValueOnce({
      id: 'loan_1',
      status: GroupLoanStatus.REPAID,
    });
    await expect(service.repay('loan_1', 500)).rejects.toThrow('Loan is not active');
  });
});

// ─── Full Lifecycle Simulation ────────────────────────────────────────────────

describe('Cooperative Treasury — Full Lifecycle', () => {
  it('simulates: group created → contributions → loan → repayment → treasury replenished', async () => {
    const prisma = makePrismaMock();
    const events = { emit: jest.fn() };
    const ledger = new GroupLedgerService(prisma as any);
    const groupWallet = new GroupWalletService(prisma as any, ledger, events as any);
    const treasury = new CooperativeTreasuryService(prisma as any);
    const walletService = { getOrCreate: jest.fn(), credit: jest.fn(), debit: jest.fn() };
    const loanService = new GroupLoanService(prisma as any, groupWallet, walletService as any, events as any);

    // Step 1: Group wallet initialized
    prisma.savingsGroupWallet.findUnique.mockResolvedValueOnce(null);
    const wallet = await groupWallet.getOrCreate('group_1');
    expect(wallet).toBeDefined();
    expect(events.emit).toHaveBeenCalledWith('group.wallet.created', expect.any(Object));

    // Step 2: Member contributes — treasury grows
    const txUpdateMock = jest.fn().mockResolvedValue({});
    prisma.$transaction.mockImplementationOnce((fn: any) =>
      fn({
        savingsGroupWallet: {
          findUnique: jest.fn().mockResolvedValue({ id: 'gw_1', groupId: 'group_1', availableBalance: 0, reserveBalance: 0, lendingPoolBalance: 0 }),
          update: txUpdateMock,
        },
        groupLedgerEntry: { create: jest.fn().mockResolvedValue({ id: 'le_1' }) },
      }),
    );
    await groupWallet.credit({
      groupId: 'group_1',
      amount: 10000,
      category: GroupLedgerCategory.MEMBER_CONTRIBUTION,
      reference: 'contrib_001',
      memberId: 'user_1',
    });
    // 80/20 split applied inside transaction
    expect(txUpdateMock).toHaveBeenCalled();

    // Step 3: Treasury health evaluated
    prisma.savingsGroupWallet.findUnique.mockResolvedValue({
      id: 'gw_1', groupId: 'group_1',
      availableBalance: 8000, reserveBalance: 2000, lendingPoolBalance: 4000,
      totalContributions: 10000, totalLoansIssued: 0,
    });
    const health = await treasury.getHealth('group_1');
    expect(health.treasuryBalance).toBe(10000);
    expect(health.reserveRatio).toBeCloseTo(0.2, 1);
    expect(health.sustainabilityScore).toBeGreaterThan(50);

    // Step 4: Loan disbursed from treasury
    prisma.savingsGroupWallet.findUnique.mockResolvedValueOnce({
      id: 'gw_1', groupId: 'group_1',
      availableBalance: 8000, reserveBalance: 2000, lendingPoolBalance: 4000,
      totalContributions: 10000, totalLoansIssued: 0,
    });
    const loan = await loanService.disburse('group_1', 'user_1', 3000);
    expect(loan).toBeDefined();
    expect(events.emit).toHaveBeenCalledWith('group.loan.disbursed', expect.objectContaining({ amount: 3000 }));

    // Step 5: Loan repaid — treasury replenished
    prisma.groupLoan.findUnique.mockResolvedValueOnce({
      id: loan.id, groupId: 'group_1', groupWalletId: 'gw_1',
      borrowerId: 'user_1', amount: 3000, repaidAmount: 0, status: GroupLoanStatus.DISBURSED,
    });
    const repayment = await loanService.repay(loan.id, 3000);
    expect(repayment.fullyRepaid).toBe(true);
    expect(events.emit).toHaveBeenCalledWith('group.loan.repaid', expect.objectContaining({ fullyRepaid: true }));

    // Step 6: Group economic profile updated
    await treasury.updateGroupProfile('group_1');
    expect(prisma.groupEconomicProfile.upsert).toHaveBeenCalled();

    // Verify event sequence
    const emittedEvents = events.emit.mock.calls.map((c) => c[0]);
    expect(emittedEvents).toContain('group.wallet.created');
    expect(emittedEvents).toContain('group.wallet.credited');
    expect(emittedEvents).toContain('group.loan.disbursed');
    expect(emittedEvents).toContain('group.loan.repaid');
  });

  it('guarantees treasury never goes negative — rejects over-disbursement', async () => {
    const prisma = makePrismaMock();
    const events = { emit: jest.fn() };
    const ledger = new GroupLedgerService(prisma as any);
    const groupWallet = new GroupWalletService(prisma as any, ledger, events as any);
    const walletService = { getOrCreate: jest.fn(), credit: jest.fn(), debit: jest.fn() };
    const loanService = new GroupLoanService(prisma as any, groupWallet, walletService as any, events as any);

    // Lending pool has only 500
    prisma.savingsGroupWallet.findUnique.mockResolvedValue({
      id: 'gw_1', groupId: 'group_1', lendingPoolBalance: 500,
    });

    await expect(loanService.disburse('group_1', 'user_1', 10000)).rejects.toThrow('Insufficient lending pool');
  });

  it('ledger remains immutable — no update or delete methods exposed', () => {
    const prisma = makePrismaMock();
    const ledger = new GroupLedgerService(prisma as any);
    expect(typeof (ledger as any).update).toBe('undefined');
    expect(typeof (ledger as any).delete).toBe('undefined');
    expect(typeof (ledger as any).deleteEntry).toBe('undefined');
  });
});
