import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
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

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig, jwtConfig, squadConfig],
      validationSchema: envValidationSchema,
      validationOptions: { abortEarly: true },
    }),
    EventEmitterModule.forRoot(),
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
  ],
})
export class AppModule {}
