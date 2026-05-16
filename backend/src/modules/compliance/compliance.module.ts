import { Module } from '@nestjs/common';
import { ComplianceEventListener } from './compliance-event.listener';
import { ObservabilityModule } from '../observability/observability.module';
import { QueueModule } from '../queue/queue.module';

@Module({
  imports: [ObservabilityModule, QueueModule],
  providers: [ComplianceEventListener],
})
export class ComplianceModule {}
