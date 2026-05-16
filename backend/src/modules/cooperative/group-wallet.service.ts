import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { GroupLedgerCategory, LedgerDirection, LedgerEntryType } from '../../common/prisma-enums';
import { PrismaService } from '../../prisma/prisma.service';
import { GroupLedgerService } from './group-ledger.service';

export const GROUP_WALLET_EVENTS = {
  CREDITED: 'group.wallet.credited',
  DEBITED: 'group.wallet.debited',
  CREATED: 'group.wallet.created',
} as const;

@Injectable()
export class GroupWalletService {
  private readonly logger = new Logger(GroupWalletService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly groupLedger: GroupLedgerService,
    private readonly events: EventEmitter2,
  ) {}

  async getOrCreate(groupId: string) {
    const existing = await this.prisma.savingsGroupWallet.findUnique({ where: { groupId } });
    if (existing) return existing;
    const wallet = await this.prisma.savingsGroupWallet.create({ data: { groupId } });
    this.events.emit(GROUP_WALLET_EVENTS.CREATED, { groupId, walletId: wallet.id });
    return wallet;
  }

  async getWallet(groupId: string) {
    const wallet = await this.prisma.savingsGroupWallet.findUnique({ where: { groupId } });
    if (!wallet) throw new NotFoundException('Group wallet not found');
    return wallet;
  }

  /** Credit group treasury — called on member contribution */
  async credit(input: {
    groupId: string;
    amount: number;
    category: GroupLedgerCategory;
    reference: string;
    memberId?: string;
    metadata?: Record<string, any>;
  }) {
    const idempotent = await this.groupLedger.getEntryByReference(input.reference);
    if (idempotent) return idempotent;

    return this.prisma.$transaction(async (tx) => {
      const wallet = await tx.savingsGroupWallet.findUnique({ where: { groupId: input.groupId } });
      if (!wallet) throw new NotFoundException('Group wallet not found');

      const balanceBefore = wallet.availableBalance;
      const balanceAfter = balanceBefore + input.amount;

      // Allocate: 80% available, 20% reserve
      const reserve = input.amount * 0.2;
      const available = input.amount - reserve;

      await tx.savingsGroupWallet.update({
        where: { id: wallet.id },
        data: {
          availableBalance: { increment: available },
          reserveBalance: { increment: reserve },
          lendingPoolBalance: { increment: available * 0.5 },
          totalContributions: { increment: input.amount },
        },
      });

      const entry = await this.groupLedger.append({
        groupWalletId: wallet.id,
        type: LedgerEntryType.CREDIT,
        direction: LedgerDirection.CREDIT,
        amount: input.amount,
        reference: input.reference,
        category: input.category,
        balanceBefore,
        balanceAfter,
        memberId: input.memberId,
        metadata: input.metadata,
      }, tx);

      this.events.emit(GROUP_WALLET_EVENTS.CREDITED, { groupId: input.groupId, amount: input.amount });
      return entry;
    });
  }

  /** Debit group treasury — called on loan disbursement or payout */
  async debit(input: {
    groupId: string;
    amount: number;
    category: GroupLedgerCategory;
    reference: string;
    memberId?: string;
    metadata?: Record<string, any>;
  }) {
    const idempotent = await this.groupLedger.getEntryByReference(input.reference);
    if (idempotent) return idempotent;

    return this.prisma.$transaction(async (tx) => {
      const wallet = await tx.savingsGroupWallet.findUnique({ where: { groupId: input.groupId } });
      if (!wallet) throw new NotFoundException('Group wallet not found');
      if (wallet.lendingPoolBalance < input.amount) {
        throw new BadRequestException('Insufficient lending pool balance');
      }

      const balanceBefore = wallet.availableBalance;
      const balanceAfter = balanceBefore - input.amount;

      await tx.savingsGroupWallet.update({
        where: { id: wallet.id },
        data: {
          availableBalance: { decrement: input.amount },
          lendingPoolBalance: { decrement: input.amount },
          totalLoansIssued: { increment: input.amount },
        },
      });

      const entry = await this.groupLedger.append({
        groupWalletId: wallet.id,
        type: LedgerEntryType.DEBIT,
        direction: LedgerDirection.DEBIT,
        amount: input.amount,
        reference: input.reference,
        category: input.category,
        balanceBefore,
        balanceAfter,
        memberId: input.memberId,
        metadata: input.metadata,
      }, tx);

      this.events.emit(GROUP_WALLET_EVENTS.DEBITED, { groupId: input.groupId, amount: input.amount });
      return entry;
    });
  }

  /** Replenish treasury on loan repayment */
  async replenish(input: {
    groupId: string;
    amount: number;
    reference: string;
    memberId?: string;
  }) {
    return this.prisma.$transaction(async (tx) => {
      const wallet = await tx.savingsGroupWallet.findUnique({ where: { groupId: input.groupId } });
      if (!wallet) throw new NotFoundException('Group wallet not found');

      await tx.savingsGroupWallet.update({
        where: { id: wallet.id },
        data: {
          availableBalance: { increment: input.amount },
          lendingPoolBalance: { increment: input.amount },
        },
      });

      return this.groupLedger.append({
        groupWalletId: wallet.id,
        type: LedgerEntryType.CREDIT,
        direction: LedgerDirection.CREDIT,
        amount: input.amount,
        reference: input.reference,
        category: GroupLedgerCategory.GROUP_LOAN_REPAYMENT,
        balanceBefore: wallet.availableBalance,
        balanceAfter: wallet.availableBalance + input.amount,
        memberId: input.memberId,
      }, tx);
    });
  }
}
