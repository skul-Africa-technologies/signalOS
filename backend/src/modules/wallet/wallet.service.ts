import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { LedgerCategory, LedgerDirection, LedgerEntryType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { LedgerService } from '../ledger/ledger.service';

export const WALLET_EVENTS = {
  CREDITED: 'wallet.credited',
  DEBITED: 'wallet.debited',
  CREATED: 'wallet.created',
} as const;

export interface WalletCreditInput {
  userId: string;
  amount: number;
  category: LedgerCategory;
  reference: string;
  metadata?: Record<string, any>;
}

export interface WalletDebitInput {
  userId: string;
  amount: number;
  category: LedgerCategory;
  reference: string;
  metadata?: Record<string, any>;
}

@Injectable()
export class WalletService {
  private readonly logger = new Logger(WalletService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ledger: LedgerService,
    private readonly events: EventEmitter2,
  ) {}

  async getOrCreate(userId: string) {
    const existing = await this.prisma.wallet.findUnique({ where: { userId } });
    if (existing) return existing;

    const wallet = await this.prisma.wallet.create({ data: { userId } });
    this.events.emit(WALLET_EVENTS.CREATED, { userId, walletId: wallet.id });
    this.logger.log(`Wallet created for user ${userId}`);
    return wallet;
  }

  async getWallet(userId: string) {
    const wallet = await this.prisma.wallet.findUnique({ where: { userId } });
    if (!wallet) throw new NotFoundException('Wallet not found');
    return wallet;
  }

  async credit(input: WalletCreditInput) {
    const { userId, amount, category, reference, metadata } = input;
    if (amount <= 0) throw new BadRequestException('Credit amount must be positive');

    // Idempotency: skip if reference already processed
    const existing = await this.ledger.getEntryByReference(reference);
    if (existing) {
      this.logger.warn(`Duplicate credit reference ${reference} — skipping`);
      return existing;
    }

    return this.prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.findUnique({ where: { userId } });
      if (!wallet) throw new NotFoundException('Wallet not found');

      const balanceBefore = wallet.availableBalance;
      const balanceAfter = balanceBefore + amount;

      await tx.wallet.update({
        where: { id: wallet.id },
        data: {
          availableBalance: balanceAfter,
          totalCredits: { increment: amount },
        },
      });

      const entry = await tx.ledgerEntry.create({
        data: {
          walletId: wallet.id,
          type: LedgerEntryType.CREDIT,
          direction: LedgerDirection.CREDIT,
          amount,
          reference,
          category,
          balanceBefore,
          balanceAfter,
          metadata: metadata ?? {},
        },
      });

      this.events.emit(WALLET_EVENTS.CREDITED, { userId, amount, balanceAfter, category });
      this.logger.log(`Wallet credited: user=${userId} amount=${amount} ref=${reference}`);
      return entry;
    });
  }

  async debit(input: WalletDebitInput) {
    const { userId, amount, category, reference, metadata } = input;
    if (amount <= 0) throw new BadRequestException('Debit amount must be positive');

    const existing = await this.ledger.getEntryByReference(reference);
    if (existing) {
      this.logger.warn(`Duplicate debit reference ${reference} — skipping`);
      return existing;
    }

    return this.prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.findUnique({ where: { userId } });
      if (!wallet) throw new NotFoundException('Wallet not found');
      if (wallet.availableBalance < amount) {
        throw new BadRequestException('Insufficient wallet balance');
      }

      const balanceBefore = wallet.availableBalance;
      const balanceAfter = balanceBefore - amount;

      await tx.wallet.update({
        where: { id: wallet.id },
        data: {
          availableBalance: balanceAfter,
          totalDebits: { increment: amount },
        },
      });

      const entry = await tx.ledgerEntry.create({
        data: {
          walletId: wallet.id,
          type: LedgerEntryType.DEBIT,
          direction: LedgerDirection.DEBIT,
          amount,
          reference,
          category,
          balanceBefore,
          balanceAfter,
          metadata: metadata ?? {},
        },
      });

      this.events.emit(WALLET_EVENTS.DEBITED, { userId, amount, balanceAfter, category });
      this.logger.log(`Wallet debited: user=${userId} amount=${amount} ref=${reference}`);
      return entry;
    });
  }

  async getBalance(userId: string) {
    const wallet = await this.getWallet(userId);
    return {
      available: wallet.availableBalance,
      pending: wallet.pendingBalance,
      frozen: wallet.frozenBalance,
      totalCredits: wallet.totalCredits,
      totalDebits: wallet.totalDebits,
    };
  }
}
