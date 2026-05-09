import { IsString, IsNumber, IsPositive } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class IssueGroupLoanDto {
  @ApiProperty({ example: 'user_id_here', description: 'Member to receive the loan' })
  @IsString()
  borrowerId: string;

  @ApiProperty({ example: 10000, description: 'Loan amount in Naira' })
  @IsNumber()
  @IsPositive()
  amount: number;
}

export class RepayGroupLoanDto {
  @ApiProperty({ example: 5000, description: 'Repayment amount in Naira' })
  @IsNumber()
  @IsPositive()
  amount: number;
}
