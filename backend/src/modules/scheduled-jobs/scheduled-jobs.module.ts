import { Module } from '@nestjs/common';
import { ScheduledJobsService } from './scheduled-jobs.service';
import { RepaymentModule } from '../repayment/repayment.module';
import { TrustScoreModule } from '../trust-score/trust-score.module';
import { CooperativeModule } from '../cooperative/cooperative.module';
import { IntelligenceEngineModule } from '../intelligence-engine/intelligence-engine.module';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [RepaymentModule, TrustScoreModule, CooperativeModule, IntelligenceEngineModule, NotificationModule],
  providers: [ScheduledJobsService],
})
export class ScheduledJobsModule {}
