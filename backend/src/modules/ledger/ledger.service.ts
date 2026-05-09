import { Injectable, Logger } from '@nestjs/common';
import { LedgerCategory, LedgerDirection, LedgerEntryType, LedgerStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export interface CreateLedgerEntryInput {
  walletId: string;
  type: LedgerEntryType;
  direction: LedgerDirection;
  amount: number;
  reference: string;
  category: LedgerCategory;
  balanceBefore: number;
  balanceAfter: number;
  metadata?: Record<string, any>;
  status?: LedgerStatus;
}

@Injectable()
export class LedgerService {
  private readonly logger = new Logger(LedgerService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Append-only: never update or delete ledger entries */
  async append(input: CreateLedgerEntryInput) {
    return this.prisma.ledgerEntry.create({
      data: {
        walletId: input.walletId,
        type: input.type,
        direction: input.direction,
        amount: input.amount,
        reference: input.reference,
        category: input.category,
        balanceBefore: input.balanceBefore,
        balanceAfter: input.balanceAfter,
        metadata: input.metadata ?? {},
        status: input.status ?? LedgerStatus.COMPLETED,
      },
    });
  }

  async getWalletLedger(walletId: string, limit = 50, offset = 0) {
    return this.prisma.ledgerEntry.findMany({
      where: { walletId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });
  }

  async getUserLedger(userId: string, limit = 50, offset = 0) {
    const wallet = await this.prisma.wallet.findUnique({ where: { userId } });
    if (!wallet) return [];
    return this.getWalletLedger(wallet.id, limit, offset);
  }

  /** Derive balance from ledger — source of truth */
  async computeBalance(walletId: string): Promise<number> {
    const result = await this.prisma.ledgerEntry.aggregate({
      where: { walletId, status: LedgerStatus.COMPLETED },
      _sum: { amount: true },
    });
    // This is a simplified approach; real balance is tracked on wallet for performance
    // but can be verified against ledger at any time
    return result._sum.amount ?? 0;
  }

  async getEntryByReference(reference: string) {
    return this.prisma.ledgerEntry.findUnique({ where: { reference } });
  }
}
