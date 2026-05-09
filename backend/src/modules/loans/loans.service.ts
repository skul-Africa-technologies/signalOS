import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TrustScoreService } from '../trust-score/trust-score.service';
import type { RiskLevel } from '../trust-score/scoring.engine';

export interface EligibilityResult {
  eligible: boolean;
  eligibleAmount: number;
  riskLevel: RiskLevel;
  recommendation: string;
  trustScore: number;
  breakdown: Record<string, number>;
  reasons: string[];
}

@Injectable()
export class LoansService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly trustScore: TrustScoreService,
  ) {}

  async evaluate(userId: string): Promise<EligibilityResult> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const report = await this.trustScore.recalculate(userId);
    const { trustScore, riskLevel, breakdown, reasons } = report;

    const eligible = trustScore >= 40;
    const eligibleAmount = this.calcAmount(trustScore, riskLevel);
    const recommendation = this.buildRecommendation(eligible, riskLevel, eligibleAmount);

    await this.prisma.loanEligibility.upsert({
      where: { userId },
      create: { userId, eligible, eligibleAmount, riskLevel, recommendation, trustScore },
      update: { eligible, eligibleAmount, riskLevel, recommendation, trustScore, evaluatedAt: new Date() },
    });

    return { eligible, eligibleAmount, riskLevel, recommendation, trustScore, breakdown, reasons };
  }

  async getEligibility(userId: string) {
    const record = await this.prisma.loanEligibility.findUnique({ where: { userId } });
    if (!record) return this.evaluate(userId);
    return record;
  }

  private calcAmount(score: number, risk: RiskLevel): number {
    if (score < 40) return 0;
    // Base: ₦5,000 per trust point above 40, capped by risk tier
    const base = (score - 40) * 5000;
    const caps: Record<RiskLevel, number> = {
      Low: 500_000,
      Medium: 200_000,
      High: 75_000,
      'Very High': 0,
    };
    return Math.min(base, caps[risk]);
  }

  private buildRecommendation(eligible: boolean, risk: RiskLevel, amount: number): string {
    if (!eligible) return 'Build more transaction history to qualify for a loan';
    const fmt = new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 });
    const labels: Record<RiskLevel, string> = {
      Low: 'Eligible for micro expansion loan',
      Medium: 'Eligible for working capital loan',
      High: 'Eligible for starter micro-loan',
      'Very High': 'Not eligible at this time',
    };
    return `${labels[risk]} up to ${fmt.format(amount)}`;
  }
}
