import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { IntelligenceEngineService } from './intelligence-engine.service';
import { IntelligenceEventListener } from './listeners/intelligence.listener';
import { PaymentSuccessListener } from './listeners/payment-success.listener';
import { SavingsContributionListener } from './listeners/savings-contribution.listener';
import { TransactionFailedListener } from './listeners/transaction-failed.listener';
import { InactiveUserListener } from './listeners/inactive-user.listener';
// Extractors
import { SignalExtractor } from './extractors/signal.extractor';
import { PaymentSignalExtractor } from './extractors/payment-signal.extractor';
import { SavingsSignalExtractor } from './extractors/savings-signal.extractor';
import { TransactionSignalExtractor } from './extractors/transaction-signal.extractor';
import { ParticipationSignalExtractor } from './extractors/participation-signal.extractor';
import { SignalPersistenceService } from './extractors/signal-persistence.service';
// Analyzers
import { BehaviourAnalyzer } from './analyzers/behaviour.analyzer';
import { CashflowAnalyzer } from './analyzers/cashflow.analyzer';
import { RecommendationAnalyzer } from './analyzers/recommendation.analyzer';
import { GrowthOpportunityAnalyzer } from './analyzers/growth-opportunity.analyzer';
// Calculators
import { ScoreCalculator } from './calculators/score.calculator';
import { TrustScoreCalculator } from './calculators/trust-score.calculator';
// Evaluators
import { RiskEvaluator } from './evaluators/risk.evaluator';
import { EligibilityEvaluator } from './evaluators/eligibility.evaluator';
import { TrustLevelEvaluator } from './evaluators/trust-level.evaluator';
import { VolatilityEvaluator } from './evaluators/volatility.evaluator';
import { LoanEligibilityEvaluator } from './evaluators/loan-eligibility.evaluator';
import { RepaymentConfidenceEvaluator } from './evaluators/repayment-confidence.evaluator';
// Profiles
import { ProfileBuilder } from './profiles/profile.builder';
import { ProfileStore } from './profiles/profile.store';
import { EconomicProfileBuilder } from './profiles/economic-profile.builder';
import { EconomicProfileService } from './profiles/economic-profile.service';
import { ProfileSyncService } from './profiles/profile-sync.service';
import { SnapshotService } from './profiles/snapshot.service';

@Module({
  imports: [PrismaModule],
  providers: [
    IntelligenceEngineService,
    // Extractors
    SignalExtractor,
    PaymentSignalExtractor,
    SavingsSignalExtractor,
    TransactionSignalExtractor,
    ParticipationSignalExtractor,
    SignalPersistenceService,
    // Analyzers
    BehaviourAnalyzer,
    CashflowAnalyzer,
    RecommendationAnalyzer,
    GrowthOpportunityAnalyzer,
    // Calculators
    ScoreCalculator,
    TrustScoreCalculator,
    // Evaluators
    RiskEvaluator,
    EligibilityEvaluator,
    TrustLevelEvaluator,
    VolatilityEvaluator,
    RepaymentConfidenceEvaluator,
    LoanEligibilityEvaluator,
    // Profiles
    ProfileBuilder,
    ProfileStore,
    EconomicProfileBuilder,
    EconomicProfileService,
    ProfileSyncService,
    SnapshotService,
    // Listeners
    IntelligenceEventListener,
    PaymentSuccessListener,
    SavingsContributionListener,
    TransactionFailedListener,
    InactiveUserListener,
  ],
  exports: [IntelligenceEngineService, EconomicProfileService, SnapshotService],
})
export class IntelligenceEngineModule {}
