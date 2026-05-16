import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsOptional, IsString, IsUrl, IsArray } from 'class-validator';
import { OrgType, RateLimitTier } from '../../../common/prisma-enums';

export class CreateOrganizationDto {
  @ApiProperty({ example: 'First Bank Nigeria' })
  @IsString()
  name: string;

  @ApiProperty({ enum: OrgType })
  @IsEnum(OrgType)
  type: OrgType;

  @ApiProperty({ example: 'api@firstbank.ng' })
  @IsEmail()
  contactEmail: string;

  @ApiPropertyOptional({ example: 'https://hooks.firstbank.ng/signalos' })
  @IsOptional()
  @IsUrl()
  webhookUrl?: string;

  @ApiPropertyOptional({ enum: RateLimitTier })
  @IsOptional()
  @IsEnum(RateLimitTier)
  rateLimitTier?: RateLimitTier;

  @ApiPropertyOptional({ type: [String], example: ['trust:read', 'loan:read'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowedScopes?: string[];
}

export class IssueApiKeyDto {
  @ApiPropertyOptional({ example: 'Production Key' })
  @IsOptional()
  @IsString()
  label?: string;

  @ApiPropertyOptional({ type: [String], example: ['trust:read', 'loan:read'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  scopes?: string[];
}
