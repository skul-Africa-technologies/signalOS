import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString, IsUrl } from 'class-validator';

export const WEBHOOK_EVENTS = [
  'trust.score.updated',
  'loan.eligible',
  'repayment.defaulted',
  'fraud.detected',
  'cooperative.risk.changed',
  'treasury.health.changed',
] as const;

export type WebhookEvent = typeof WEBHOOK_EVENTS[number];

export class CreateWebhookSubscriptionDto {
  @ApiProperty({ example: 'https://hooks.bank.ng/signalos' })
  @IsUrl()
  url: string;

  @ApiProperty({ type: [String], example: ['trust.score.updated', 'loan.eligible'] })
  @IsArray()
  @IsString({ each: true })
  events: string[];
}

export class EmitWebhookDto {
  @ApiProperty({ example: 'trust.score.updated' })
  @IsString()
  event: string;

  @ApiProperty()
  payload: Record<string, unknown>;

  @ApiPropertyOptional({ example: 'org_123' })
  @IsOptional()
  @IsString()
  organizationId?: string;
}
