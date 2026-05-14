import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { IntelligenceEngineService } from '../intelligence-engine/intelligence-engine.service';
import { CooperativeTreasuryService } from '../cooperative/cooperative-treasury.service';

@Injectable()
export class IntelligenceApiService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly engine: IntelligenceEngineService,
    private readonly treasury: CooperativeTreasuryService,
  ) {}

  async getTrustScore(userId: string) {
    const result = await this.engine.analyseUser(userId);
    const { scores, riskLevel } = result.profile;

    return {
      trustScore: Math.round(scores.trustScore),
      riskLevel: this.normalizeRisk(riskLevel),
      reliabilityScore: Math.round(scores.reliabilityScore),
      liquidityScore: Math.round(scores.liquidityScore),
      behaviorConfidence: parseFloat((scores.consistencyScore / 100).toFixed(2)),
      recommendedLoanLimit: this.calcLoanLimit(scores.trustScore, riskLevel),
    };
  }

  async getFinancialIdentity(userId: string) {
    const result = await this.engine.analyseUser(userId);
    const { signals, scores } = result.profile;

    return {
      financialActivityLevel: this.levelFromScore(signals.activityLevel),
      incomeStability: this.levelFromScore(signals.incomeStability),
      savingsBehavior: this.behaviorLabel(signals.savingsBehaviour),
      groupParticipation: signals.groupParticipation > 30,
      repaymentBehavior: this.repaymentLabel(signals.repaymentConsistency),
      economicConfidence: parseFloat((scores.trustScore / 100).toFixed(2)),
    };
  }

  async getLoanEligibility(userId: string) {
    const result = await this.engine.analyseUser(userId);
    const { scores, riskLevel, eligibilityFlags } = result.profile;

    const eligible = eligibilityFlags.loanEligible;
    const recommendedAmount = this.calcLoanLimit(scores.trustScore, riskLevel);
    const defaultProbability = this.calcDefaultProbability(scores.trustScore, riskLevel);

    return {
      eligible,
      riskLevel: this.normalizeRisk(riskLevel),
      recommendedAmount,
      recommendedDurationMonths: this.calcDuration(riskLevel),
      defaultProbability,
    };
  }

  async getCooperativeHealth(groupId: string) {
    const [health, profile, memberCount] = await Promise.all([
      this.treasury.getHealth(groupId),
      this.prisma.groupEconomicProfile.findUnique({ where: { groupId } }),
      this.prisma.groupMember.count({ where: { groupId } }),
    ]);

    if (!profile) throw new NotFoundException('Cooperative profile not found');

    return {
      groupTrustScore: Math.round(profile.groupReliability),
      treasuryHealth: this.treasuryHealthLabel(health.sustainabilityScore),
      contributionConsistency: Math.round(profile.contributionConsistency),
      liquidityRatio: parseFloat(health.reserveRatio.toFixed(2)),
      activeMembers: memberCount,
      sustainabilityScore: Math.round(health.sustainabilityScore),
    };
  }

  async getActivity(userId: string) {
    const result = await this.engine.analyseUser(userId);
    const { signals } = result.profile;

    return {
      transactionFrequency: this.levelFromScore(signals.transactionFrequency),
      incomeConsistency: this.stabilityLabel(signals.incomeStability),
      walletActivityLevel: this.levelFromScore(signals.activityLevel),
      contributionRegularity: parseFloat((signals.contributionReliability / 100).toFixed(2)),
      economicStability: this.stabilityLabel((signals.incomeStability + signals.cashflowVolatility) / 2),
    };
  }

  async analyzeFraud(userId: string) {
    const result = await this.engine.analyseUser(userId);
    const { signals, scores } = result.profile;

    const suspiciousPatterns: string[] = [];
    if (signals.cashflowVolatility < 20) suspiciousPatterns.push('extreme_cashflow_volatility');
    if (signals.transactionFrequency > 95) suspiciousPatterns.push('unusually_high_transaction_frequency');
    if (signals.repaymentConsistency < 10) suspiciousPatterns.push('near_zero_repayment_consistency');

    const fraudRisk = suspiciousPatterns.length >= 2 ? 'HIGH' : suspiciousPatterns.length === 1 ? 'MEDIUM' : 'LOW';
    const confidence = parseFloat(Math.min(0.99, 0.7 + scores.consistencyScore / 333).toFixed(2));

    return { fraudRisk, suspiciousPatterns, confidence };
  }

  // ─── Helpers ────────────────────────────────────────────────────────────────

  private normalizeRisk(level: string): string {
    const map: Record<string, string> = { Low: 'LOW', Medium: 'MEDIUM', High: 'HIGH', 'Very High': 'VERY_HIGH' };
    return map[level] ?? 'UNKNOWN';
  }

  private levelFromScore(score: number): string {
    if (score >= 70) return 'HIGH';
    if (score >= 40) return 'MEDIUM';
    return 'LOW';
  }

  private stabilityLabel(score: number): string {
    if (score >= 70) return 'STABLE';
    if (score >= 40) return 'MODERATE';
    return 'UNSTABLE';
  }

  private behaviorLabel(score: number): string {
    if (score >= 70) return 'CONSISTENT';
    if (score >= 40) return 'IRREGULAR';
    return 'ABSENT';
  }

  private repaymentLabel(score: number): string {
    if (score >= 70) return 'GOOD';
    if (score >= 40) return 'FAIR';
    return 'POOR';
  }

  private treasuryHealthLabel(score: number): string {
    if (score >= 75) return 'STRONG';
    if (score >= 50) return 'MODERATE';
    return 'WEAK';
  }

  private calcLoanLimit(trustScore: number, riskLevel: string): number {
    const caps: Record<string, number> = { Low: 500_000, Medium: 200_000, High: 75_000, 'Very High': 0 };
    const base = Math.max(0, (trustScore - 40) * 5_000);
    return Math.min(base, caps[riskLevel] ?? 0);
  }

  private calcDuration(riskLevel: string): number {
    const map: Record<string, number> = { Low: 12, Medium: 6, High: 3, 'Very High': 0 };
    return map[riskLevel] ?? 0;
  }

  private calcDefaultProbability(trustScore: number, riskLevel: string): number {
    const base: Record<string, number> = { Low: 0.05, Medium: 0.15, High: 0.35, 'Very High': 0.80 };
    const adjustment = Math.max(0, (70 - trustScore) * 0.002);
    return parseFloat(Math.min(0.99, (base[riskLevel] ?? 0.5) + adjustment).toFixed(2));
  }
}
