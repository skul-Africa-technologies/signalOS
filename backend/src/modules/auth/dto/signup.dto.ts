import { IsEnum, IsNotEmpty, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { BusinessType } from '@prisma/client';

export class SignupDto {
  @ApiProperty({ example: 'Amara Okafor', description: 'Full name of the user' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: '+2348012345678', description: 'Phone number in international format' })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiProperty({ example: 'SecurePass123', minLength: 6 })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({ enum: BusinessType, example: BusinessType.TRADER, description: 'Type of informal economic activity' })
  @IsEnum(BusinessType)
  businessType: BusinessType;
}
