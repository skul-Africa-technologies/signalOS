import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, Min } from 'class-validator';

export class SimulateLoanDto {
  @ApiProperty({ example: 'clxxx' }) @IsString() userId: string;
  @ApiProperty({ example: 'clyyy' }) @IsString() groupId: string;
  @ApiProperty({ example: 250000 }) @IsNumber() @Min(1000) loanAmount: number;
  @ApiProperty({ example: 6 }) @IsNumber() @Min(1) durationMonths: number;
}

export class UnderwritingQueryDto {
  @ApiPropertyOptional({ example: 'clyyy' }) @IsOptional() @IsString() groupId?: string;
}
