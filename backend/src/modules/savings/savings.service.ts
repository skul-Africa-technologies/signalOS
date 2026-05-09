import {
  Injectable,
  ConflictException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { ContributeDto } from './dto/contribute.dto';

export const SAVINGS_CONTRIBUTION_EVENT = 'savings.contribution';

@Injectable()
export class SavingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventEmitter2,
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
}
