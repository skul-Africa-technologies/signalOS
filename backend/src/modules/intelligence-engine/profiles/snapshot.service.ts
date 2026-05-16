import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { EconomicSignals, IntelligenceScores, RiskReport, TrustReport } from '../interfaces/intelligence.interfaces';

export interface SnapshotInput {
  userId: string;
  signals: EconomicSignals;
  scores: IntelligenceScores;
  trustReport: TrustReport;
  riskReport: RiskReport;
  recommendations: string[];
  loanEligible: boolean;
  eligibleAmount: number;
  dataPoints: number;
  triggeredBy?: string;
}

@Injectable()
export class SnapshotService {
  private readonly logger = new Logger(SnapshotService.name);

  constructor(private readonly prisma: PrismaService) {}

  async persist(input: SnapshotInput): Promise<void> {
    const profile = await this.prisma.economicProfile.findUnique({ where: { userId: input.userId } });
    if (!profile) {
      this.logger.warn(`No profile found for user ${input.userId} — skipping snapshot`);
      return;
    }

    await Promise.all([
      this.saveSignal(input, profile.id),
      this.saveRiskAssessment(input, profile.id),
      this.saveSnapshot(input, profile.id),
    ]);

    this.logger.debug(`Intelligence snapshot persisted for user ${input.userId}`);
  }

  async getHistory(userId: string, limit = 10) {
    return this.prisma.intelligenceSnapshot.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  private saveSignal(input: SnapshotInput, profileId: string) {
    return this.prisma.financialSignal.create({
      data: {
        id: this.cuid(),
        userId: input.userId,
        profileId,
        ...input.signals,
        dataPoints: input.dataPoints,
      },
    });
  }

  private saveRiskAssessment(input: SnapshotInput, profileId: string) {
    return this.prisma.riskAssessment.create({
      data: {
        id: this.cuid(),
        userId: input.userId,
        profileId,
        riskLevel: input.riskReport.riskLevel,
        riskScore: input.riskReport.riskScore,
        volatilityDetected: input.riskReport.volatilityDetected,
        inactivityDetected: input.riskReport.inactivityDetected,
        flags: JSON.stringify(input.riskReport.flags),
      },
    });
  }

  private saveSnapshot(input: SnapshotInput, profileId: string) {
    return this.prisma.intelligenceSnapshot.create({
      data: {
        id: this.cuid(),
        userId: input.userId,
        profileId,
        trustScore: input.trustReport.trustScore,
        riskLevel: input.trustReport.riskLevel,
        confidenceLevel: input.trustReport.confidence,
        eligibleForLoan: input.loanEligible,
        eligibleAmount: input.eligibleAmount,
        recommendations: JSON.stringify(input.recommendations),
        signalSummary: JSON.stringify(input.signals),
        scoreSummary: JSON.stringify(input.scores),
        triggeredBy: input.triggeredBy ?? 'analysis',
      },
    });
  }

  private cuid(): string {
    // Simple unique ID — Prisma cuid() is DB-side; we generate one for the create call
    return `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 9)}`;
  }
}
