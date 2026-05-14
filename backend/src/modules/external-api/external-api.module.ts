import { Module } from '@nestjs/common';
import { OrganizationService } from './organization.service';
import { OrganizationController } from './organization.controller';
import { ConsentService } from './consent.service';
import { ConsentController } from './consent.controller';
import { ApiKeyGuard } from './guards/api-key.guard';
import { RateLimitGuard } from './guards/rate-limit.guard';
import { RateLimitService } from './rate-limit.service';
import { AuditService } from './audit.service';
import { IntelligenceApiService } from './intelligence-api.service';
import { IntelligenceApiController } from './intelligence-api.controller';
import { WebhookService } from './webhook.service';
import { WebhookController } from './webhook.controller';
import { WebhookEventListener } from './webhook-event.listener';
import { IntelligenceEngineModule } from '../intelligence-engine/intelligence-engine.module';
import { CooperativeModule } from '../cooperative/cooperative.module';

@Module({
  imports: [IntelligenceEngineModule, CooperativeModule],
  providers: [
    OrganizationService,
    ConsentService,
    AuditService,
    RateLimitService,
    IntelligenceApiService,
    WebhookService,
    WebhookEventListener,
    ApiKeyGuard,
    RateLimitGuard,
  ],
  controllers: [
    OrganizationController,
    ConsentController,
    IntelligenceApiController,
    WebhookController,
  ],
  exports: [WebhookService, AuditService, ConsentService],
})
export class ExternalApiModule {}
