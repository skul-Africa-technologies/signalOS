import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsDateString, IsOptional, IsString } from 'class-validator';

export const VALID_SCOPES = ['trust:read', 'identity:read', 'loan:read', 'cooperative:read', 'fraud:read', 'activity:read'];

export class GrantConsentDto {
  @ApiProperty({ example: 'usr_123' })
  @IsString()
  userId: string;

  @ApiProperty({ example: 'org_456' })
  @IsString()
  organizationId: string;

  @ApiProperty({ type: [String], example: ['trust:read', 'loan:read'] })
  @IsArray()
  @IsString({ each: true })
  scopes: string[];

  @ApiProperty({ example: 'loan_underwriting' })
  @IsString()
  purpose: string;

  @ApiPropertyOptional({ example: '2026-12-31T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}
