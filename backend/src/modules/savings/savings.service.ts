import {
  Injectable,
  ConflictException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { LedgerCategory } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { WalletService } from '../wallet/wallet.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { ContributeDto } from './dto/contribute.dto';

export const SAVINGS_CONTRIBUTION_EVENT = 'savings.contribution';

@Injectable()
export class SavingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventEmitter2,
    private readonly walletService: WalletService,
  ) {}

  createGroup(userId: string, dto: CreateGroupDto) {
    return this.prisma.savingsGroup.create({
      data: { ...dto, createdById: userId },
    });
  }

  listGroups() {
    return this.prisma.savingsGroup.findMany({
      include: { _count: { select: { members: true, contributions: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async joinGroup(userId: string, groupId: string) {
    const group = await this.prisma.savingsGroup.findUnique({ where: { id: groupId } });
    if (!group) throw new NotFoundException('Group not found');

    const existing = await this.prisma.groupMember.findUnique({
      where: { userId_groupId: { userId, groupId } },
    });
    if (existing) throw new ConflictException('Already a member');

    return this.prisma.groupMember.create({ data: { userId, groupId } });
  }

  async contribute(userId: string, groupId: string, dto: ContributeDto) {
    const member = await this.prisma.groupMember.findUnique({
      where: { userId_groupId: { userId, groupId } },
    });
    if (!member) throw new ForbiddenException('Must be a group member to contribute');

    const contribution = await this.prisma.contribution.create({
      data: { userId, groupId, amount: dto.amount },
    });

    // Debit wallet for savings contribution
    try {
      const wallet = await this.walletService.getOrCreate(userId);
      const walletRecord = await this.prisma.wallet.findUnique({ where: { id: wallet.id } });
      if (walletRecord && walletRecord.availableBalance >= dto.amount) {
        await this.walletService.debit({
          userId,
          amount: dto.amount,
          category: LedgerCategory.SAVINGS_CONTRIBUTION,
          reference: `savings_${contribution.id}`,
          metadata: { groupId, contributionId: contribution.id },
        });
      }
    } catch {
      // Non-blocking: wallet debit failure doesn't block contribution recording
    }

    this.events.emit(SAVINGS_CONTRIBUTION_EVENT, { userId, contribution });

    return contribution;
  }

  getGroupContributions(groupId: string) {
    return this.prisma.contribution.findMany({
      where: { groupId },
      include: { user: { select: { id: true, name: true, businessType: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  getUserContributions(userId: string) {
    return this.prisma.contribution.findMany({
      where: { userId },
      include: { group: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getGroupAnalytics(groupId: string) {
    const [group, contributions, memberCount] = await Promise.all([
      this.prisma.savingsGroup.findUnique({ where: { id: groupId } }),
      this.prisma.contribution.findMany({ where: { groupId } }),
      this.prisma.groupMember.count({ where: { groupId } }),
    ]);
    if (!group) throw new NotFoundException('Group not found');

    const totalSaved = contributions.reduce((s, c) => s + c.amount, 0);
    const progress = group.targetAmount > 0
      ? Math.min(100, Math.round((totalSaved / group.targetAmount) * 100))
      : null;

    return { group, memberCount, totalSaved, contributionCount: contributions.length, progress };
  }

  async getGroupBalance(groupId: string) {
    const contributions = await this.prisma.contribution.findMany({ where: { groupId } });
    return {
      groupId,
      totalPooled: contributions.reduce((s, c) => s + c.amount, 0),
      contributionCount: contributions.length,
    };
  }
}
