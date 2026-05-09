import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../prisma/prisma.service';
import { SignalExtractor } from './extractors/signal.extractor';
import { WalletSignalExtractor } from './extractors/wallet-signal.extractor';
import { SignalPersistenceService } from './extractors/signal-persistence.service';
import { ScoreCalculator } from './calculators/score.calculator';
import { TrustScoreCalculator } from './calculators/trust-score.calculator';
import { RiskEvaluator } from './evaluators/risk.evaluator';
import { VolatilityEvaluator } from './evaluators/volatility.evaluator';
import { EligibilityEvaluator } from './evaluators/eligibility.evaluator';
import { LoanEligibilityEvaluator } from './evaluators/loan-eligibility.evaluator';
import { RecommendationAnalyzer } from './analyzers/recommendation.analyzer';
import { GrowthOpportunityAnalyzer, GrowthOpportunity } from './analyzers/growth-opportunity.analyzer';
import { ProfileBuilder } from './profiles/profile.builder';
import { ProfileStore } from './profiles/profile.store';
import { SnapshotService } from './profiles/snapshot.service';
import {
  IntelligenceResult,
  TrustReport,
  RiskReport,
  LoanEligibilityResult,
  IntelligenceRecommendation,
} from './interfaces/intelligence.interfaces';
import { INTELLIGENCE_EVENTS } from './intelligence.constants';

@Injectable()
export class IntelligenceEngineService {
  private readonly logger = new Logger(IntelligenceEngineService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly signalExtractor: SignalExtractor,
    private readonly walletSignalExtractor: WalletSignalExtractor,
    private readonly signalPersistence: SignalPersistenceService,
    private readonly scoreCalculator: ScoreCalculator,
    private readonly trustCalculator: TrustScoreCalculator,
    private readonly riskEvaluator: RiskEvaluator,
    private readonly volatilityEvaluator: VolatilityEvaluator,
    private readonly eligibilityEvaluator: EligibilityEvaluator,
    private readonly loanEligibilityEvaluator: LoanEligibilityEvaluator,
    private readonly recommendationAnalyzer: RecommendationAnalyzer,
    private readonly growthAnalyzer: GrowthOpportunityAnalyzer,
    private readonly profileBuilder: ProfileBuilder,
    private readonly profileStore: ProfileStore,
    private readonly snapshotService: SnapshotService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async analyseUser(userId: string): Promise<IntelligenceResult> {
    this.logger.log(`Running intelligence analysis for user ${userId}`);

    const { transactions, contributions, memberships, signals, dataPoints } =
      await this.fetchSignals(userId);

    await this.signalPersistence.save({ userId, signals, extractedAt: new Date(), dataPoints });

    const trustReport = this.trustCalculator.calculate(signals, dataPoints);
    const riskReport = this.riskEvaluator.evaluateDetailed(signals);
    const scores = this.scoreCalculator.calculate(signals);
    scores.trustScore = trustReport.trustScore;

    const eligibilityFlags = this.eligibilityEvaluator.evaluate(scores);
    const recommendations = this.recommendationAnalyzer.analyze(signals, scores);
    const profile = this.profileBuilder.build(userId, signals, scores, riskReport.riskLevel, eligibilityFlags);
    await this.profileStore.save(profile);

    const loanEligibility = this.loanEligibilityEvaluator.evaluate(signals, scores, riskReport.riskLevel);

    // Persist longitudinal history (fire-and-forget — don't block the response)
    this.snapshotService.persist({
      userId,
      signals,
      scores,
      trustReport,
      riskReport,
      recommendations: recommendations.map((r) => r.recommendation),
      loanEligible: loanEligibility.eligible,
      eligibleAmount: loanEligibility.eligibleAmount,
      dataPoints,
    }).catch((err) => this.logger.error(`Snapshot failed for ${userId}: ${err.message}`));

    const result: IntelligenceResult = {
      userId,
      profile,
      recommendations: recommendations.map((r) => r.recommendation),
      processedAt: new Date(),
    };

    this.eventEmitter.emit(INTELLIGENCE_EVENTS.PROFILE_UPDATED, { userId, scores });
    this.eventEmitter.emit(INTELLIGENCE_EVENTS.SCORES_COMPUTED, { userId, trustReport, riskReport });

    this.logger.log(
      `Analysis complete for ${userId}: trust=${trustReport.trustScore} risk=${riskReport.riskLevel} recs=${recommendations.length}`,
    );

    return result;
  }

  async getTrustReport(userId: string): Promise<TrustReport> {
    const { signals, dataPoints } = await this.fetchSignals(userId);
    return this.trustCalculator.calculate(signals, dataPoints);
  }

  async getRiskReport(userId: string): Promise<RiskReport> {
    const { transactions, signals } = await this.fetchSignals(userId);
    const volatility = this.volatilityEvaluator.evaluate(transactions);
    const report = this.riskEvaluator.evaluateDetailed(signals);
    if (volatility.hasSpike) report.flags.push(volatility.summary);
    return report;
  }

  async getLoanEligibility(userId: string): Promise<LoanEligibilityResult> {
    const { signals, dataPoints } = await this.fetchSignals(userId);
    const trustReport = this.trustCalculator.calculate(signals, dataPoints);
    const scores = this.scoreCalculator.calculate(signals);
    scores.trustScore = trustReport.trustScore;
    return this.loanEligibilityEvaluator.evaluate(signals, scores, trustReport.riskLevel);
  }

  async getRecommendations(userId: string): Promise<IntelligenceRecommendation[]> {
    const { signals } = await this.fetchSignals(userId);
    const scores = this.scoreCalculator.calculate(signals);
    return this.recommendationAnalyzer.analyze(signals, scores);
  }

  async getGrowthOpportunities(userId: string): Promise<GrowthOpportunity[]> {
    const { signals } = await this.fetchSignals(userId);
    const scores = this.scoreCalculator.calculate(signals);
    return this.growthAnalyzer.analyze(signals, scores);
  }

  private async fetchSignals(userId: string) {
    const [transactions, contributions, memberships, wallet] = await Promise.all([
      this.prisma.transaction.findMany({ where: { userId }, orderBy: { createdAt: 'asc' } }),
      this.prisma.contribution.findMany({ where: { userId }, orderBy: { createdAt: 'asc' } }),
      this.prisma.groupMember.findMany({ where: { userId } }),
      this.prisma.wallet.findUnique({
        where: { userId },
        include: { ledgerEntries: { orderBy: { createdAt: 'desc' }, take: 100 } },
      }),
    ]);
    const dataPoints = transactions.length + contributions.length + memberships.length;
    const signals = this.signalExtractor.extract(transactions, contributions, memberships);
    const walletSignals = this.walletSignalExtractor.extract(
      wallet,
      wallet?.ledgerEntries ?? [],
    );
    return { transactions, contributions, memberships, signals, walletSignals, dataPoints };
  }
}
