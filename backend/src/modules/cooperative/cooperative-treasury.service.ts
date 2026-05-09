import { Injectable } from '@nestjs/common';
import { GroupLoanStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export interface TreasuryHealth {
  groupId: string;
  treasuryBalance: number;
  reserveRatio: number;
  lendingCapacity: number;
  activeLoans: number;
  sustainabilityScore: number;
  memberCount: number;
}

@Injectable()
export class CooperativeTreasuryService {
  constructor(private readonly prisma: PrismaService) {}

  async getHealth(groupId: string): Promise<TreasuryHealth> {
    const [wallet, activeLoans, memberCount] = await Promise.all([
      this.prisma.savingsGroupWallet.findUnique({ where: { groupId } }),
      this.prisma.groupLoan.count({ where: { groupId, status: GroupLoanStatus.DISBURSED } }),
      this.prisma.groupMember.count({ where: { groupId } }),
    ]);

    if (!wallet) {
      return { groupId, treasuryBalance: 0, reserveRatio: 0, lendingCapacity: 0, activeLoans: 0, sustainabilityScore: 0, memberCount };
    }

    const total = wallet.availableBalance + wallet.reserveBalance;
    const reserveRatio = total > 0 ? wallet.reserveBalance / total : 0;
    const lendingCapacity = wallet.lendingPoolBalance;
    const sustainabilityScore = this.calcSustainability(wallet, activeLoans, memberCount);

    // Persist snapshot
    await this.prisma.treasurySnapshot.create({
      data: { groupId, treasuryBalance: total, reserveRatio, lendingCapacity, activeLoans, sustainabilityScore, memberCount },
    });

    return { groupId, treasuryBalance: total, reserveRatio, lendingCapacity, activeLoans, sustainabilityScore, memberCount };
  }

  async updateGroupProfile(groupId: string) {
    const health = await this.getHealth(groupId);
    const contributions = await this.prisma.contribution.findMany({ where: { groupId } });
    const loans = await this.prisma.groupLoan.findMany({ where: { groupId } });

    const repaid = loans.filter((l) => l.status === GroupLoanStatus.REPAID).length;
    const repaymentPerformance = loans.length > 0 ? (repaid / loans.length) * 100 : 50;

    const memberCount = health.memberCount;
    const activeMembers = contributions.length > 0
      ? new Set(contributions.map((c) => c.userId)).size
      : 0;
    const memberParticipation = memberCount > 0 ? (activeMembers / memberCount) * 100 : 0;

    await this.prisma.groupEconomicProfile.upsert({
      where: { groupId },
      create: {
        groupId,
        treasuryHealth: health.sustainabilityScore,
        groupReliability: repaymentPerformance,
        contributionConsistency: Math.min(100, contributions.length * 5),
        repaymentPerformance,
        memberParticipation,
        liquidityStability: health.reserveRatio * 100,
        lendingSustainability: health.lendingCapacity > 0 ? 80 : 20,
        sustainabilityScore: health.sustainabilityScore,
        reserveRatio: health.reserveRatio,
      },
      update: {
        treasuryHealth: health.sustainabilityScore,
        groupReliability: repaymentPerformance,
        contributionConsistency: Math.min(100, contributions.length * 5),
        repaymentPerformance,
        memberParticipation,
        liquidityStability: health.reserveRatio * 100,
        lendingSustainability: health.lendingCapacity > 0 ? 80 : 20,
        sustainabilityScore: health.sustainabilityScore,
        reserveRatio: health.reserveRatio,
      },
    });

    return health;
  }

  async getGroupEconomicProfile(groupId: string) {
    return this.prisma.groupEconomicProfile.findUnique({ where: { groupId } });
  }

  private calcSustainability(wallet: any, activeLoans: number, memberCount: number): number {
    let score = 50;
    const total = wallet.availableBalance + wallet.reserveBalance;
    if (total > 0) score += 20;
    if (wallet.reserveBalance / (total || 1) >= 0.2) score += 15;
    if (activeLoans === 0) score += 10;
    else if (activeLoans <= 3) score += 5;
    if (memberCount >= 5) score += 5;
    return Math.min(100, score);
  }
}
