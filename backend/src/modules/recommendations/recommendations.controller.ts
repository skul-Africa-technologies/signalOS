import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { RecommendationsService } from './recommendations.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RecommendationDto, RecommendationSummaryDto, ErrorResponseDto } from '../../common/swagger/response.models';

@ApiTags('Recommendations')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard)
@Controller('recommendations')
export class RecommendationsController {
  constructor(private readonly recs: RecommendationsService) {}

  @Get()
  @ApiOperation({
    summary: 'Get financial recommendations',
    description: 'Returns personalized loan, savings, and growth recommendations based on the user\'s current trust score, savings activity, and transaction history.',
  })
  @ApiResponse({ status: 200, description: 'Recommendations list', type: [RecommendationDto] })
  @ApiResponse({ status: 401, description: 'Unauthorized', type: ErrorResponseDto })
  getRecommendations(@CurrentUser('sub') userId: string) {
    return this.recs.getRecommendations(userId);
  }

  @Get('summary')
  @ApiOperation({
    summary: 'Get recommendations with eligibility summary',
    description: 'Returns the full financial intelligence dashboard: current loan eligibility + all recommendations in a single response. Ideal for dashboard rendering.',
  })
  @ApiResponse({ status: 200, description: 'Recommendations summary', type: RecommendationSummaryDto })
  @ApiResponse({ status: 401, description: 'Unauthorized', type: ErrorResponseDto })
  getSummary(@CurrentUser('sub') userId: string) {
    return this.recs.getSummary(userId);
  }
}
