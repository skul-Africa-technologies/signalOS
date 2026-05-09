import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { IdentityService } from './identity.service';
import { SignalExtractorService } from './signal-extractor.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { EconomicProfileDto, ErrorResponseDto } from '../../common/swagger/response.models';

@ApiTags('Economic Identity')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard)
@Controller('identity')
export class IdentityController {
  constructor(
    private readonly identity: IdentityService,
    private readonly signals: SignalExtractorService,
  ) {}

  @Get('profile')
  @ApiOperation({
    summary: 'Get economic identity profile',
    description: 'Returns the full economic profile including trust, reliability, liquidity, and employability scores derived from behavioral transaction data.',
  })
  @ApiResponse({ status: 200, description: 'Economic profile', type: EconomicProfileDto })
  @ApiResponse({ status: 401, description: 'Unauthorized', type: ErrorResponseDto })
  async getProfile(@CurrentUser('sub') userId: string) {
    return this.identity.getOrCreateProfile(userId);
  }

  @Post('recalculate')
  @ApiOperation({
    summary: 'Recalculate all economic signals',
    description: 'Extracts behavioral signals from transaction history and updates the full economic profile (trust, reliability, liquidity, employability). Normally triggered automatically by `payment.success` events.',
  })
  @ApiResponse({ status: 201, description: 'Updated economic profile', type: EconomicProfileDto })
  @ApiResponse({ status: 401, description: 'Unauthorized', type: ErrorResponseDto })
  async recalculate(@CurrentUser('sub') userId: string) {
    const scores = await this.signals.extract(userId);
    return this.identity.updateScores(userId, scores);
  }
}
