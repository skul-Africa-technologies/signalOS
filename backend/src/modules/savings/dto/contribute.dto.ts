import { IsNumber, IsPositive } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ContributeDto {
  @ApiProperty({ example: 5000, description: 'Contribution amount in NGN. Triggers savings.contribution event → trust score recalculation.' })
  @IsNumber()
  @IsPositive()
  amount: number;
}
