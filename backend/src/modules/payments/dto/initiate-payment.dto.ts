import { IsEmail, IsNumber, IsOptional, IsPositive, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class InitiatePaymentDto {
  @ApiProperty({ example: 'user@example.com', description: 'Customer email for Squad payment' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 150000, description: 'Amount in kobo (150000 = ₦1,500)' })
  @IsNumber()
  @IsPositive()
  amount!: number;

  @ApiPropertyOptional({ example: 'https://yourapp.com/payment/callback' })
  @IsString()
  @IsOptional()
  callbackUrl?: string;
}
