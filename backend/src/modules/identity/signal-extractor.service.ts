import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TransactionStatus } from '../../common/prisma-enums';

export interface EconomicSignals {
  trustScore: number;
  reliabilityScore: number;
  liquidityScore: number;
  employabilityScore: number;
}

@Injectable()
export class SignalExtractorService {
  constructor(private readonly prisma: PrismaService) {}

  async extract(userId: string): Promise<EconomicSignals> {
    const txns = await this.prisma.transaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    });

    const total = txns.length;
    const successful = txns.filter((t) => t.status === TransactionStatus.SUCCESS);
    const successCount = successful.length;
    const totalVolume = successful.reduce((sum, t) => sum + t.amount, 0);

    // Trust: based on success rate + volume (0–100)
    const successRate = total > 0 ? successCount / total : 0;
    const trustScore = Math.min(100, Math.round(successRate * 60 + Math.log1p(successCount) * 10));

    // Reliability: consistency — penalise gaps > 30 days between transactions
    const reliabilityScore = this.calcReliability(successful.map((t) => t.createdAt));

    // Liquidity: average transaction size relative to a ₦10k baseline
    const avgAmount = successCount > 0 ? totalVolume / successCount : 0;
    const liquidityScore = Math.min(100, Math.round((avgAmount / 10000) * 50 + Math.log1p(totalVolume / 1000) * 5));

    // Employability: activity frequency — more recent & frequent = higher
    const employabilityScore = this.calcEmployability(successful.map((t) => t.createdAt));

    return { trustScore, reliabilityScore, liquidityScore, employabilityScore };
  }

  private calcReliability(dates: Date[]): number {
    if (dates.length < 2) return dates.length === 1 ? 30 : 0;

    let gapPenalty = 0;
    for (let i = 1; i < dates.length; i++) {
      const dayGap = (dates[i].getTime() - dates[i - 1].getTime()) / 86_400_000;
      if (dayGap > 30) gapPenalty += Math.min(20, dayGap / 30);
    }

    return Math.max(0, Math.min(100, Math.round(50 + dates.length * 5 - gapPenalty)));
  }

  private calcEmployability(dates: Date[]): number {
    if (dates.length === 0) return 0;

    const now = Date.now();
    const daysSinceLast = (now - dates[dates.length - 1].getTime()) / 86_400_000;
    const recencyBonus = Math.max(0, 30 - daysSinceLast); // up to 30 pts for recent activity
    const frequencyScore = Math.min(50, dates.length * 5);

    return Math.min(100, Math.round(frequencyScore + recencyBonus));
  }
}
