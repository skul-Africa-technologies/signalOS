import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TransactionStatus, TransactionType, Prisma } from '@prisma/client';

@Injectable()
export class TransactionsService {
  constructor(private readonly prisma: PrismaService) {}

  create(data: {
    userId: string;
    reference: string;
    amount: number;
    type: TransactionType;
    currency?: string;
    channel?: string;
    metadata?: Prisma.InputJsonValue;
  }) {
    return this.prisma.transaction.create({ data });
  }

  findByReference(reference: string) {
    return this.prisma.transaction.findUnique({ where: { reference } });
  }

  findBySquadReference(squadReference: string) {
    return this.prisma.transaction.findUnique({ where: { squadReference } });
  }

  updateStatus(
    id: string,
    status: TransactionStatus,
    extra?: { squadReference?: string; metadata?: Prisma.InputJsonValue },
  ) {
    return this.prisma.transaction.update({
      where: { id },
      data: { status, ...extra },
    });
  }

  findByUser(userId: string) {
    return this.prisma.transaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
