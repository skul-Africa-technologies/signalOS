import { IsString, IsNumber, IsPositive, IsOptional, Length } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class WithdrawDto {
  @ApiProperty({ example: 5000, description: 'Amount in Naira to withdraw' })
  @IsNumber()
  @IsPositive()
  amount: number;

  @ApiProperty({ example: '058', description: 'Bank code (e.g. 058 for GTBank)' })
  @IsString()
  @Length(3, 10)
  bankCode: string;

  @ApiProperty({ example: '0123456789', description: '10-digit account number' })
  @IsString()
  @Length(10, 10)
  accountNumber: string;

  @ApiProperty({ example: 'John Doe', description: 'Account holder name' })
  @IsString()
  accountName: string;

  @ApiPropertyOptional({ example: 'Withdrawal from signalOS wallet' })
  @IsOptional()
  @IsString()
  narration?: string;
}
