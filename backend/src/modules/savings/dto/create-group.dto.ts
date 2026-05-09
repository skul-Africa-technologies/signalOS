import { IsNumber, IsOptional, IsPositive, IsString, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateGroupDto {
  @ApiProperty({ example: 'Market Women Coop', minLength: 3 })
  @IsString()
  @MinLength(3)
  name: string;

  @ApiPropertyOptional({ example: 'Weekly savings group for Balogun market traders' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ example: 500000, description: 'Target savings amount in NGN' })
  @IsNumber()
  @IsPositive()
  @IsOptional()
  targetAmount?: number;
}
