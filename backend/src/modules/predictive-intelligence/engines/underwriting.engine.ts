import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { UnderwritingRecommendation, LoanSimulationResult, FinancialRecommendation } from '../interfaces/prediction.interfaces';
import { RepaymentPredictionEngine } from './prediction.engines';
import { TreasuryForecastEngine } from './treasury-forecast.engine';

const BASE_LOAN_AMOUNT = 50_000;
const MAX_LOAN_AMOUNT = 1_000_000;

@Injectable()
export class UnderwritingEngine {
  private readonly logger = new Logger(UnderwritingEngine.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly repaymentEngine: RepaymentPredictionEngine,
    private readonly treasuryEngine: TreasuryForecastEngine,
  ) {}

  async underwrite(userId: string, groupId?: string): Promise<UnderwritingRecommendation> {
    const [profile, repaymentPrediction] = await Promise.all([
      this.prisma.economicProfile.findUnique({ where: { userId } }),
      this.repaymentEngine.predict(userId),
    ]);

    const trustScore = profile?.trustScore ?? 0;
    const repaymentProb = repaymentPrediction.repaymentProbability;
    const defaultRisk = repaymentPrediction.defaultRisk;

    // Treasury-aware lending: check group capacity if applicable
    let treasuryCapacity = MAX_LOAN_AMOUNT;
    if (groupId) {
      const forecast = await this.treasuryEngine.forecast(groupId);
      treasuryCapacity = forecast.lendingCapacityForecast;
    }

    // Recommended amount: trust-weighted, capped by treasury
    const trustMultiplier = trustScore / 100;
    const repaymentMultiplier = repaymentProb;
    const rawAmount = BASE_LOAN_AMOUNT + (trustMultiplier * repaymentMultiplier * (MAX_LOAN_AMOUNT - BASE_LOAN_AMOUNT));
    const recommendedAmount = Math.min(Math.round(rawAmount / 1000) * 1000, treasuryCapacity);

    // Duration: higher risk → shorter term
    const recommendedDurationMonths = defaultRisk > 0.5 ? 3 : defaultRisk > 0.3 ? 6 : 12;

    // Interest adjustment: positive trust → discount, high risk → premium
    const interestAdjustment = trustScore >= 70 ? -2 : trustScore >= 50 ? 0 : defaultRisk > 0.5 ? 3 : 1;

    const confidence = (repaymentProb * 0.6 + (trustScore / 100) * 0.4);
    const approved = repaymentProb >= 0.5 && defaultRisk < 0.6 && trustScore >= 30;

    const reasoning: string[] = [];
    if (trustScore >= 70) reasoning.push('High trust score qualifies for premium terms');
    if (repaymentProb >= 0.8) reasoning.push('Strong repayment probability supports larger loan');
    if (defaultRisk > 0.5) reasoning.push('Elevated default risk — conservative amount recommended');
    if (!approved) reasoning.push('Risk profile does not meet minimum lending threshold');

    this.logger.log(`Underwriting for ${userId}: amount=${recommendedAmount} approved=${approved} confidence=${confidence.toFixed(2)}`);

    return {
      userId,
      recommendedLoanAmount: approved ? recommendedAmount : 0,
      recommendedDurationMonths,
      interestAdjustment,
      confidence,
      riskAdjustedRate: 15 + interestAdjustment,
      reasoning,
      approved,
    };
  }

  async simulate(params: { userId: string; groupId: string; loanAmount: number; durationMonths: number }): Promise<LoanSimulationResult> {
    const [forecast, repaymentPrediction] = await Promise.all([
      this.treasuryEngine.forecast(params.groupId),
      this.repaymentEngine.predict(params.userId),
    ]);

    const utilizationRatio = params.loanAmount / Math.max(forecast.currentBalance, 1);
    const projectedRepaymentRate = repaymentPrediction.repaymentProbability;
    const treasuryImpact = utilizationRatio * 100;

    const liquidityPressure: LoanSimulationResult['liquidityPressure'] =
      utilizationRatio > 0.7 ? 'CRITICAL' :
      utilizationRatio > 0.5 ? 'HIGH' :
      utilizationRatio > 0.3 ? 'MEDIUM' : 'LOW';

    const riskScore = (1 - projectedRepaymentRate) * 50 + utilizationRatio * 50;

    const recommendation = liquidityPressure === 'CRITICAL'
      ? 'Loan amount exceeds safe treasury utilization. Reduce amount or wait for treasury replenishment.'
      : liquidityPressure === 'HIGH'
      ? 'Loan is feasible but will strain treasury reserves. Proceed with caution.'
      : 'Loan is within safe treasury parameters. Proceed.';

    return {
      scenario: `₦${params.loanAmount.toLocaleString()} over ${params.durationMonths} months`,
      projectedRepaymentRate,
      treasuryImpact,
      liquidityPressure,
      riskScore,
      recommendation,
    };
  }
}

@Injectable()
export class RecommendationEngine {
  constructor(private readonly prisma: PrismaService) {}

  async generate(userId: string): Promise<FinancialRecommendation[]> {
    const [profile, wallet, predictions] = await Promise.all([
      this.prisma.economicProfile.findUnique({ where: { userId } }),
      this.prisma.wallet.findUnique({ where: { userId } }),
      this.prisma.predictionSnapshot.findMany({
        where: { userId, expiresAt: { gt: new Date() } },
        orderBy: { generatedAt: 'desc' },
        take: 10,
      }),
    ]);

    const recs: FinancialRecommendation[] = [];
    const trustScore = profile?.trustScore ?? 0;
    const balance = wallet?.availableBalance ?? 0;

    const defaultRiskPred = predictions.find((p) => p.predictionType === 'DEFAULT_RISK');
    const trustEvoPred = predictions.find((p) => p.predictionType === 'TRUST_EVOLUTION');

    if (trustScore < 50) {
      recs.push({
        category: 'REPAYMENT',
        priority: 'HIGH',
        message: 'Improve your repayment consistency to unlock better loan terms.',
        actionableSteps: ['Make all repayments on time', 'Avoid overdue installments', 'Maintain wallet balance above ₦5,000'],
        estimatedImpact: 'Trust score could increase by 10–15 points in 30 days',
      });
    }

    if (balance < 5000) {
      recs.push({
        category: 'SAVINGS',
        priority: 'HIGH',
        message: 'Increase weekly savings by ₦5,000 to improve loan access.',
        actionableSteps: ['Set up automatic weekly savings', 'Reduce unnecessary withdrawals', 'Join a cooperative savings group'],
        estimatedImpact: 'Liquidity score improvement of 8–12 points',
      });
    }

    if ((defaultRiskPred?.predictedValue ?? 0) > 0.5) {
      recs.push({
        category: 'RISK_MITIGATION',
        priority: 'HIGH',
        message: 'Your default risk is elevated. Take action to reduce financial exposure.',
        actionableSteps: ['Clear any overdue installments immediately', 'Reduce outstanding loan balance', 'Increase savings contributions'],
        estimatedImpact: 'Default risk reduction of 15–25%',
      });
    }

    if (trustScore >= 70) {
      recs.push({
        category: 'GROWTH',
        priority: 'MEDIUM',
        message: 'Your trust profile qualifies you for premium financial products.',
        actionableSteps: ['Apply for an increased loan limit', 'Explore cooperative investment opportunities', 'Consider a savings plan upgrade'],
        estimatedImpact: 'Access to up to ₦500,000 in credit facilities',
      });
    }

    if ((trustEvoPred?.metadata as any)?.trajectory === 'DECLINING') {
      recs.push({
        category: 'REPAYMENT',
        priority: 'MEDIUM',
        message: 'Your trust trajectory is declining. Consistent activity will reverse this.',
        actionableSteps: ['Complete at least 3 transactions this week', 'Make a savings contribution', 'Repay any pending installments'],
        estimatedImpact: 'Stabilize trust trajectory within 14 days',
      });
    }

    return recs;
  }

  async generateForTreasury(groupId: string): Promise<FinancialRecommendation[]> {
    const profile = await this.prisma.groupEconomicProfile.findUnique({ where: { groupId } });
    const recs: FinancialRecommendation[] = [];

    if (!profile) return recs;

    if (profile.reserveRatio < 0.15) {
      recs.push({
        category: 'TREASURY',
        priority: 'HIGH',
        message: 'Treasury reserve ratio approaching unsafe threshold.',
        actionableSteps: ['Pause new loan disbursements', 'Increase member contribution targets', 'Accelerate loan repayment collection'],
        estimatedImpact: 'Reserve ratio recovery to safe levels within 60 days',
      });
    }

    if (profile.repaymentPerformance < 60) {
      recs.push({
        category: 'RISK_MITIGATION',
        priority: 'HIGH',
        message: 'Cooperative repayment performance is below safe threshold.',
        actionableSteps: ['Identify and follow up with defaulting members', 'Tighten loan eligibility criteria', 'Implement penalty enforcement'],
        estimatedImpact: 'Repayment rate improvement of 10–20%',
      });
    }

    return recs;
  }
}
