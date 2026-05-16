import { IsString, IsNumber, IsOptional, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SimulateLoanDto {
  @ApiProperty({ description: 'Group ID for treasury-aware simulation' })
  @IsString()
  groupId: string;

  @ApiProperty({ description: 'Loan amount in NGN', example: 250000 })
  @IsNumber()
  @Min(1000)
  loanAmount: number;

  @ApiProperty({ description: 'Loan duration in months', example: 6 })
  @IsNumber()
  @Min(1)
  @Max(60)
  durationMonths: number;
}

export class UnderwriteDto {
  @ApiPropertyOptional({ description: 'Cooperative group ID for treasury-aware underwriting' })
  @IsOptional()
  @IsString()
  groupId?: string;
}
