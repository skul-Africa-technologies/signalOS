import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ScoringEngine, ScoreReport } from './scoring.engine';

@Injectable()
export class TrustScoreService {
  private readonly logger = new Logger(TrustScoreService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly engine: ScoringEngine,
  ) {}

  async recalculate(userId: string): Promise<ScoreReport> {
    const [txns, savingsCount] = await Promise.all([
      this.prisma.transaction.findMany({ where: { userId }, orderBy: { createdAt: 'asc' } }),
      this.prisma.contribution.count({ where: { userId } }),
    ]);

    const report = this.engine.evaluate(txns, savingsCount);

    await Promise.all([
      this.prisma.user.update({ where: { id: userId }, data: { trustScore: report.trustScore } }),
      this.prisma.economicProfile.upsert({
        where: { userId },
        create: { userId, trustScore: report.trustScore },
        update: { trustScore: report.trustScore },
      }),
    ]);

    this.logger.log(`Trust score for ${userId}: ${report.trustScore} (${report.riskLevel})`);
    return report;
  }

  async getReport(userId: string): Promise<ScoreReport> {
    const [txns, savingsCount] = await Promise.all([
      this.prisma.transaction.findMany({ where: { userId }, orderBy: { createdAt: 'asc' } }),
      this.prisma.contribution.count({ where: { userId } }),
    ]);
    return this.engine.evaluate(txns, savingsCount);
  }
}
