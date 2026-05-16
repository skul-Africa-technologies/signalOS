import { Injectable } from '@nestjs/common';
import { GroupLedgerCategory, LedgerDirection, LedgerEntryType, LedgerStatus } from '../../common/prisma-enums';
import { PrismaService } from '../../prisma/prisma.service';

export interface GroupLedgerInput {
  groupWalletId: string;
  type: LedgerEntryType;
  direction: LedgerDirection;
  amount: number;
  reference: string;
  category: GroupLedgerCategory;
  balanceBefore: number;
  balanceAfter: number;
  memberId?: string;
  metadata?: Record<string, any>;
}

@Injectable()
export class GroupLedgerService {
  constructor(private readonly prisma: PrismaService) {}

  /** Append-only — never update or delete */
  append(input: GroupLedgerInput, tx?: any) {
    const db = tx ?? this.prisma;
    return db.groupLedgerEntry.create({
      data: {
        groupWalletId: input.groupWalletId,
        type: input.type,
        direction: input.direction,
        amount: input.amount,
        reference: input.reference,
        category: input.category,
        balanceBefore: input.balanceBefore,
        balanceAfter: input.balanceAfter,
        memberId: input.memberId,
        metadata: input.metadata ?? {},
        status: LedgerStatus.COMPLETED,
      },
    });
  }

  getGroupLedger(groupWalletId: string, limit = 50, offset = 0) {
    return this.prisma.groupLedgerEntry.findMany({
      where: { groupWalletId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });
  }

  getEntryByReference(reference: string) {
    return this.prisma.groupLedgerEntry.findUnique({ where: { reference } });
  }
}
