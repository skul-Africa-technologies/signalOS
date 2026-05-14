import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsOptional, IsPositive, IsString } from 'class-validator';

export enum RepaymentInterval {
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
}

export class GenerateScheduleDto {
  @ApiProperty({ example: 'loan_abc123' })
  @IsString()
  loanId: string;

  @ApiProperty({ example: 120000 })
  @IsNumber()
  @IsPositive()
  principal: number;

  @ApiProperty({ example: 6 })
  @IsNumber()
  @IsPositive()
  installments: number;

  @ApiProperty({ enum: RepaymentInterval, default: RepaymentInterval.MONTHLY })
  @IsEnum(RepaymentInterval)
  interval: RepaymentInterval;

  @ApiPropertyOptional({ example: 5, description: 'Annual interest rate %' })
  @IsOptional()
  @IsNumber()
  annualInterestRate?: number;
}

export class MakeRepaymentDto {
  @ApiProperty({ example: 'loan_abc123' })
  @IsString()
  loanId: string;

  @ApiProperty({ example: 20000 })
  @IsNumber()
  @IsPositive()
  amount: number;

  @ApiPropertyOptional({ example: 'schedule_xyz' })
  @IsOptional()
  @IsString()
  scheduleId?: string;
}
