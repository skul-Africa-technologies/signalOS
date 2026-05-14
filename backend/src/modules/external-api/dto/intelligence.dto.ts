import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class TrustScoreRequestDto {
  @ApiProperty({ example: 'usr_123' })
  @IsString()
  userId: string;

  @ApiProperty({ example: 'loan_underwriting' })
  @IsString()
  purpose: string;
}

export class LoanEligibilityRequestDto {
  @ApiProperty({ example: 'usr_123' })
  @IsString()
  userId: string;

  @ApiProperty({ example: 'loan_underwriting' })
  @IsString()
  purpose: string;
}

export class FraudAnalysisRequestDto {
  @ApiProperty({ example: 'usr_123' })
  @IsString()
  userId: string;

  @ApiProperty({ example: 'transaction_screening' })
  @IsString()
  purpose: string;
}
