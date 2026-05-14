import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { ApiKeyGuard } from './guards/api-key.guard';
import { OrgContext } from './decorators/org-context.decorator';
import { WebhookService } from './webhook.service';
import { CreateWebhookSubscriptionDto } from './dto/webhook.dto';
import { Organization } from '@prisma/client';

@ApiTags('External API — Webhooks')
@ApiSecurity('x-api-key')
@ApiHeader({ name: 'x-api-key', description: 'Organization API key', required: true })
@UseGuards(ApiKeyGuard)
@Controller('api/v1/external/webhooks')
export class WebhookController {
  constructor(private readonly svc: WebhookService) {}

  @Post('subscribe')
  @ApiOperation({ summary: 'Subscribe to webhook events', description: 'Returns subscription ID. Secret is shown once — store it to verify HMAC signatures.' })
  subscribe(@Body() dto: CreateWebhookSubscriptionDto, @OrgContext() org: Organization) {
    return this.svc.subscribe(org.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List webhook subscriptions for this organization' })
  list(@OrgContext() org: Organization) {
    return this.svc.listSubscriptions(org.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Deactivate a webhook subscription' })
  remove(@Param('id') id: string, @OrgContext() org: Organization) {
    return this.svc.deleteSubscription(id, org.id);
  }
}
