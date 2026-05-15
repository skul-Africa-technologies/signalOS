import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class ResolveMismatchDto {
  @ApiProperty({ example: 'Verified with Squad dashboard — amount matches. Ledger entry was a duplicate.' })
  @IsString()
  resolutionNotes: string;
}
