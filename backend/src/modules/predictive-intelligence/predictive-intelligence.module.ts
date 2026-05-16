import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { PredictiveIntelligenceService } from './predictive-intelligence.service';
import { PredictiveIntelligenceController } from './predictive-intelligence.controller';
import { RuleBasedPredictionProvider } from './providers/rule-based-prediction.provider';
import { PredictionStoreService } from './store/prediction-store.service';
import { RepaymentPredictionEngine, TrustEvolutionEngine, FraudProbabilityEngine } from './engines/prediction.engines';
import { TreasuryForecastEngine } from './engines/treasury-forecast.engine';
import { UnderwritingEngine, RecommendationEngine } from './engines/underwriting.engine';
import { AutonomousAdaptationService } from './autonomous/autonomous-adaptation.service';
import { PredictionEventListener } from './listeners/prediction-event.listener';
import { PredictiveAnalyticsService } from './analytics/predictive-analytics.service';
import { PredictionSchedulerService } from './prediction.scheduler';

@Module({
  imports: [PrismaModule],
  controllers: [PredictiveIntelligenceController],
  providers: [
    PredictiveIntelligenceService,
    RuleBasedPredictionProvider,
    PredictionStoreService,
    RepaymentPredictionEngine,
    TrustEvolutionEngine,
    FraudProbabilityEngine,
    TreasuryForecastEngine,
    UnderwritingEngine,
    RecommendationEngine,
    AutonomousAdaptationService,
    PredictionEventListener,
    PredictiveAnalyticsService,
    PredictionSchedulerService,
  ],
  exports: [PredictiveIntelligenceService, RepaymentPredictionEngine, TrustEvolutionEngine, TreasuryForecastEngine],
})
export class PredictiveIntelligenceModule {}
