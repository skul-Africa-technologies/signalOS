import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

export interface PredictivePortfolioReport {
  generatedAt: Date;
  totalUsers: number;
  averageTrustScore: number;
  averageDefaultRisk: number;
  averageRepaymentProbability: number;
  highRiskUserCount: number;
  positiveTrajectoryCount: number;
  decliningTrajectoryCount: number;
  portfolioHealthScore: number;
  repaymentOutlook: 'STRONG' | 'MODERATE' | 'WEAK' | 'CRITICAL';
}

export interface TreasuryPortfolioReport {
  generatedAt: Date;
  totalGroups: number;
  averageSustainabilityScore: number;
  criticalTreasuryCount: number;
  adequateTreasuryCount: number;
  totalLendingCapacity: number;
  portfolioStabilityScore: number;
}

@Injectable()
export class PredictiveAnalyticsService {
  private readonly logger = new Logger(PredictiveAnalyticsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async generatePortfolioReport(): Promise<PredictivePortfolioReport> {
    const [users, predictions, profiles] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.predictionSnapshot.findMany({
        where: { expiresAt: { gt: new Date() } },
        orderBy: { generatedAt: 'desc' },
      }),
      this.prisma.economicProfile.findMany({ select: { trustScore: true, riskLevel: true } }),
    ]);

    const defaultPreds = predictions.filter((p) => p.predictionType === 'DEFAULT_RISK');
    const repaymentPreds = predictions.filter((p) => p.predictionType === 'REPAYMENT_SUCCESS');
    const trustPreds = predictions.filter((p) => p.predictionType === 'TRUST_EVOLUTION');

    const avg = (arr: number[]) => arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : 0;

    const averageDefaultRisk = avg(defaultPreds.map((p) => p.predictedValue));
    const averageRepaymentProbability = avg(repaymentPreds.map((p) => p.predictedValue));
    const averageTrustScore = avg(profiles.map((p) => p.trustScore));
    const highRiskUserCount = profiles.filter((p) => p.riskLevel === 'Very High' || p.riskLevel === 'High').length;

    const positiveTrajectoryCount = trustPreds.filter((p) => {
      const meta = JSON.parse(p.metadata as string);
      return meta.trajectory === 'POSITIVE';
    }).length;

    const decliningTrajectoryCount = trustPreds.filter((p) => {
      const meta = JSON.parse(p.metadata as string);
      return meta.trajectory === 'DECLINING' || meta.trajectory === 'CRITICAL';
    }).length;

    const portfolioHealthScore = Math.round(
      averageRepaymentProbability * 40 +
      (1 - averageDefaultRisk) * 40 +
      (averageTrustScore / 100) * 20,
    );

    const repaymentOutlook: PredictivePortfolioReport['repaymentOutlook'] =
      averageRepaymentProbability >= 0.8 ? 'STRONG' :
      averageRepaymentProbability >= 0.6 ? 'MODERATE' :
      averageRepaymentProbability >= 0.4 ? 'WEAK' : 'CRITICAL';

    return {
      generatedAt: new Date(),
      totalUsers: users,
      averageTrustScore,
      averageDefaultRisk,
      averageRepaymentProbability,
      highRiskUserCount,
      positiveTrajectoryCount,
      decliningTrajectoryCount,
      portfolioHealthScore,
      repaymentOutlook,
    };
  }

  async generateTreasuryReport(): Promise<TreasuryPortfolioReport> {
    const [groups, profiles, wallets] = await Promise.all([
      this.prisma.savingsGroup.count(),
      this.prisma.groupEconomicProfile.findMany(),
      this.prisma.savingsGroupWallet.findMany({ select: { lendingPoolBalance: true, reserveBalance: true, availableBalance: true } }),
    ]);

    const avg = (arr: number[]) => arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : 0;
    const averageSustainabilityScore = avg(profiles.map((p) => p.sustainabilityScore));

    const criticalTreasuryCount = profiles.filter((p) => p.reserveRatio < 0.1).length;
    const adequateTreasuryCount = profiles.filter((p) => p.reserveRatio >= 0.2).length;
    const totalLendingCapacity = wallets.reduce((s, w) => s + w.lendingPoolBalance, 0);
    const portfolioStabilityScore = Math.round(averageSustainabilityScore);

    return {
      generatedAt: new Date(),
      totalGroups: groups,
      averageSustainabilityScore,
      criticalTreasuryCount,
      adequateTreasuryCount,
      totalLendingCapacity,
      portfolioStabilityScore,
    };
  }
}
