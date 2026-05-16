import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsOptional, IsString, IsArray, MinLength } from 'class-validator';
import { AdminRole } from '../../../common/prisma-enums';

export class CreateAdminDto {
  @ApiProperty({ example: 'ops@signalos.io' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'SecurePass123!' })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({ enum: AdminRole })
  @IsEnum(AdminRole)
  role: AdminRole;

  @ApiPropertyOptional({ type: [String], example: ['users.read', 'wallets.read'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  permissions?: string[];
}

export class AdminLoginDto {
  @ApiProperty({ example: 'ops@signalos.io' })
  @IsEmail()
  email: string;

  @ApiProperty()
  @IsString()
  password: string;
}

export class ResolveMismatchDto {
  @ApiProperty({ example: 'Verified with Squad dashboard — amount correct' })
  @IsString()
  resolutionNotes: string;
}

export class FreezeAccountDto {
  @ApiProperty({ example: 'Suspicious transaction pattern detected' })
  @IsString()
  reason: string;
}
