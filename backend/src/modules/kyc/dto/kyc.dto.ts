import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, Length, Matches } from 'class-validator';

export enum KycVerificationLevel {
  NONE = 'NONE',
  BASIC = 'BASIC',
  INTERMEDIATE = 'INTERMEDIATE',
  FULL = 'FULL',
}

export enum KycStatus {
  PENDING = 'PENDING',
  UNDER_REVIEW = 'UNDER_REVIEW',
  VERIFIED = 'VERIFIED',
  REJECTED = 'REJECTED',
  EXPIRED = 'EXPIRED',
}

export enum KycDocumentType {
  SELFIE = 'SELFIE',
  NIN_SLIP = 'NIN_SLIP',
  VOTERS_CARD = 'VOTERS_CARD',
  DRIVERS_LICENSE = 'DRIVERS_LICENSE',
  INTERNATIONAL_PASSPORT = 'INTERNATIONAL_PASSPORT',
}

export class SubmitBvnDto {
  @ApiProperty({ description: 'Bank Verification Number (11 digits)', example: '12345678901' })
  @IsString()
  @Length(11, 11)
  @Matches(/^\d{11}$/)
  bvn: string;
}

export class SubmitNinDto {
  @ApiProperty({ description: 'National Identification Number (11 digits)', example: '12345678901' })
  @IsString()
  @Length(11, 11)
  @Matches(/^\d{11}$/)
  nin: string;
}

export class SubmitDocumentDto {
  @ApiProperty({ enum: KycDocumentType })
  @IsEnum(KycDocumentType)
  type: KycDocumentType;

  @ApiProperty({ description: 'Storage key from signed upload URL' })
  @IsString()
  storageKey: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  metadata?: string;
}

export class ReviewKycDto {
  @ApiProperty({ enum: KycStatus, description: 'New KYC status' })
  @IsEnum(KycStatus)
  status: KycStatus;

  @ApiPropertyOptional({ description: 'Required when rejecting' })
  @IsOptional()
  @IsString()
  rejectionReason?: string;
}
