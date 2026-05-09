import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { TrustScoreService } from './trust-score.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { TrustScoreDto, ErrorResponseDto } from '../../common/swagger/response.models';

@ApiTags('Trust Scores')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard)
@Controller('trust-score')
export class TrustScoreController {
  constructor(private readonly trustScore: TrustScoreService) {}

  @Get()
  @ApiOperation({
    summary: 'Get trust score report',
    description: 'Returns the current behavioral trust score with risk level, explainable reasons, and factor breakdown. Scores are computed from: transaction consistency (30%), payment frequency (25%), savings reliability (25%), and activity level (20%).',
  })
  @ApiResponse({ status: 200, description: 'Trust score report', type: TrustScoreDto })
  @ApiResponse({ status: 401, description: 'Unauthorized', type: ErrorResponseDto })
  getReport(@CurrentUser('sub') userId: string) {
    return this.trustScore.getReport(userId);
  }

  @Post('recalculate')
  @ApiOperation({
    summary: 'Force trust score recalculation',
    description: 'Recomputes the trust score from latest transaction and savings data. Normally triggered automatically by `payment.success` and `savings.contribution` events.',
  })
  @ApiResponse({ status: 201, description: 'Recalculated trust score', type: TrustScoreDto })
  @ApiResponse({ status: 401, description: 'Unauthorized', type: ErrorResponseDto })
  recalculate(@CurrentUser('sub') userId: string) {
    return this.trustScore.recalculate(userId);
  }
}
