import {
  Injectable,
  ConflictException,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { GroupLedgerCategory, LedgerCategory } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { WalletService } from '../wallet/wallet.service';
import { GroupWalletService } from '../cooperative/group-wallet.service';
import { CooperativeTreasuryService } from '../cooperative/cooperative-treasury.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { ContributeDto } from './dto/contribute.dto';

export const SAVINGS_CONTRIBUTION_EVENT = 'savings.contribution';
export const MEMBER_CONTRIBUTION_EVENT = 'member.contribution';

@Injectable()
export class SavingsService {
  private readonly logger = new Logger(SavingsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventEmitter2,
    private readonly walletService: WalletService,
    private readonly groupWallet: GroupWalletService,
    private readonly treasury: CooperativeTreasuryService,
  ) {}

  async createGroup(userId: string, dto: CreateGroupDto) {
    const group = await this.prisma.savingsGroup.create({
      data: { ...dto, createdById: userId },
    });
    // Auto-create group treasury wallet
    await this.groupWallet.getOrCreate(group.id);
    return group;
  }

  listGroups() {
    return this.prisma.savingsGroup.findMany({
      include: {
        _count: { select: { members: true, contributions: true } },
        groupWallet: { select: { availableBalance: true, totalContributions: true } },
      },
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

    // Verify user wallet has sufficient balance
    const userWallet = await this.walletService.getOrCreate(userId);
    const walletRecord = await this.prisma.wallet.findUnique({ where: { id: userWallet.id } });
    if (!walletRecord || walletRecord.availableBalance < dto.amount) {
      throw new BadRequestException(`Insufficient wallet balance. Available: ₦${walletRecord?.availableBalance ?? 0}`);
    }

    const contributionRef = `contrib_${userId}_${groupId}_${Date.now()}`;

    // Atomic: debit user wallet + credit group treasury + persist contribution
    const contribution = await this.prisma.$transaction(async (tx) => {
      // 1. Debit user wallet
      const uw = await tx.wallet.findUnique({ where: { userId } });
      if (!uw || uw.availableBalance < dto.amount) throw new BadRequestException('Insufficient balance');

      await tx.wallet.update({
        where: { id: uw.id },
        data: {
          availableBalance: { decrement: dto.amount },
          totalDebits: { increment: dto.amount },
        },
      });

      await tx.ledgerEntry.create({
        data: {
          walletId: uw.id,
          type: 'DEBIT',
          direction: 'DEBIT',
          amount: dto.amount,
          reference: `user_${contributionRef}`,
          category: LedgerCategory.SAVINGS_CONTRIBUTION,
          balanceBefore: uw.availableBalance,
          balanceAfter: uw.availableBalance - dto.amount,
          metadata: { groupId, contributionRef },
        },
      });

      // 2. Credit group treasury wallet
      const gw = await tx.savingsGroupWallet.findUnique({ where: { groupId } });
      if (!gw) throw new NotFoundException('Group wallet not found');

      const reserve = dto.amount * 0.2;
      const available = dto.amount - reserve;

      await tx.savingsGroupWallet.update({
        where: { id: gw.id },
        data: {
          availableBalance: { increment: available },
          reserveBalance: { increment: reserve },
          lendingPoolBalance: { increment: available * 0.5 },
          totalContributions: { increment: dto.amount },
        },
      });

      await tx.groupLedgerEntry.create({
        data: {
          groupWalletId: gw.id,
          type: 'CREDIT',
          direction: 'CREDIT',
          amount: dto.amount,
          reference: `group_${contributionRef}`,
          category: GroupLedgerCategory.MEMBER_CONTRIBUTION,
          balanceBefore: gw.availableBalance,
          balanceAfter: gw.availableBalance + available,
          memberId: userId,
          metadata: { contributionRef },
        },
      });

      // 3. Persist contribution record
      return tx.contribution.create({ data: { userId, groupId, amount: dto.amount } });
    });

    // Update treasury profile (non-blocking)
    this.treasury.updateGroupProfile(groupId).catch((e: any) =>
      this.logger.error(`Treasury profile update failed: ${e.message}`),
    );

    this.events.emit(SAVINGS_CONTRIBUTION_EVENT, { userId, contribution });
    this.events.emit(MEMBER_CONTRIBUTION_EVENT, { userId, groupId, amount: dto.amount, contribution });

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
    const [group, contributions, memberCount, wallet] = await Promise.all([
      this.prisma.savingsGroup.findUnique({ where: { id: groupId } }),
      this.prisma.contribution.findMany({ where: { groupId } }),
      this.prisma.groupMember.count({ where: { groupId } }),
      this.prisma.savingsGroupWallet.findUnique({ where: { groupId } }),
    ]);
    if (!group) throw new NotFoundException('Group not found');

    const totalSaved = contributions.reduce((s, c) => s + c.amount, 0);
    const progress = group.targetAmount > 0
      ? Math.min(100, Math.round((totalSaved / group.targetAmount) * 100))
      : null;

    return {
      group,
      memberCount,
      totalSaved,
      contributionCount: contributions.length,
      progress,
      treasury: wallet
        ? {
            availableBalance: wallet.availableBalance,
            reserveBalance: wallet.reserveBalance,
            lendingPoolBalance: wallet.lendingPoolBalance,
            totalContributions: wallet.totalContributions,
          }
        : null,
    };
  }
}
