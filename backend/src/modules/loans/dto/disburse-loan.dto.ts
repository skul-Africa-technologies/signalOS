import { IsNumber, IsPositive, IsOptional, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class DisburseLoanDto {
  @ApiProperty({ example: 50000, description: 'Loan amount in Naira' })
  @IsNumber()
  @IsPositive()
  amount: number;

  @ApiPropertyOptional({ example: 30, description: 'Loan term in days (default: 30)' })
  @IsOptional()
  @IsNumber()
  @Min(7)
  @Max(365)
  loanTermDays?: number;
}
