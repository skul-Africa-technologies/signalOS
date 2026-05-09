import { IsString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';

export class AnalyseUserDto {
  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsOptional()
  @IsEnum(['full', 'scores_only', 'signals_only'])
  mode?: 'full' | 'scores_only' | 'signals_only' = 'full';
}

export class IntelligenceEventPayload {
  userId: string;
  triggeredBy: 'payment' | 'transaction' | 'savings' | 'manual';
  metadata?: Record<string, unknown>;
}
