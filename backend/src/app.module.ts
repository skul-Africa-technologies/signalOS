import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { appConfig, databaseConfig, jwtConfig, squadConfig } from './config/configuration';
import { envValidationSchema } from './config/env.validation';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { TransactionsModule } from './modules/transactions/transactions.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { ScoringModule } from './modules/scoring/scoring.module';
import { SavingsModule } from './modules/savings/savings.module';
import { TrustScoreModule } from './modules/trust-score/trust-score.module';
import { IdentityModule } from './modules/identity/identity.module';
import { OpportunitiesModule } from './modules/opportunities/opportunities.module';
import { LoansModule } from './modules/loans/loans.module';
import { RecommendationsModule } from './modules/recommendations/recommendations.module';
import { IntelligenceEngineModule } from './modules/intelligence-engine/intelligence-engine.module';
import { LedgerModule } from './modules/ledger/ledger.module';
import { WalletModule } from './modules/wallet/wallet.module';
import { PayoutModule } from './modules/payout/payout.module';
import { CooperativeModule } from './modules/cooperative/cooperative.module';
import { ExternalApiModule } from './modules/external-api/external-api.module';
import { RepaymentModule } from './modules/repayment/repayment.module';
import { NotificationModule } from './modules/notification/notification.module';
import { ScheduledJobsModule } from './modules/scheduled-jobs/scheduled-jobs.module';
import { AdminModule } from './modules/admin/admin.module';
import { AuditModule } from './modules/audit/audit.module';
import { ReconciliationModule } from './modules/reconciliation/reconciliation.module';
// Phase 4
import { KycModule } from './modules/kyc/kyc.module';
import { ObservabilityModule } from './modules/observability/observability.module';
import { StorageModule } from './modules/storage/storage.module';
import { QueueModule } from './modules/queue/queue.module';
import { ComplianceModule } from './modules/compliance/compliance.module';
// Phase 5
import { PredictiveIntelligenceModule } from './modules/predictive-intelligence/predictive-intelligence.module';
import { MetricsService } from './modules/observability/metrics.service';
import { MetricsInterceptor } from './modules/observability/metrics.interceptor';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig, jwtConfig, squadConfig],
      validationSchema: envValidationSchema,
      validationOptions: { abortEarly: true },
    }),
    ThrottlerModule.forRoot([
      { name: 'short', ttl: 1000, limit: 10 },
      { name: 'medium', ttl: 60000, limit: 200 },
      { name: 'long', ttl: 3600000, limit: 2000 },
    ]),
    EventEmitterModule.forRoot(),
    ScheduleModule.forRoot(),
    PrismaModule,
    AuthModule,
    UsersModule,
    TransactionsModule,
    PaymentsModule,
    ScoringModule,
    TrustScoreModule,
    SavingsModule,
    IdentityModule,
    OpportunitiesModule,
    LoansModule,
    RecommendationsModule,
    IntelligenceEngineModule,
    LedgerModule,
    WalletModule,
    PayoutModule,
    CooperativeModule,
    ExternalApiModule,
    RepaymentModule,
    NotificationModule,
    ScheduledJobsModule,
    AdminModule,
    AuditModule,
    ReconciliationModule,
    // Phase 4
    KycModule,
    ObservabilityModule,
    StorageModule,
    QueueModule,
    ComplianceModule,
    // Phase 5
    PredictiveIntelligenceModule,
  ],
  providers: [
    MetricsService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_INTERCEPTOR, useClass: MetricsInterceptor },
  ],
})
export class AppModule {}
