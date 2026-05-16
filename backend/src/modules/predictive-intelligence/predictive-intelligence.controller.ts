import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiParam, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PredictiveIntelligenceService } from './predictive-intelligence.service';
import { SimulateLoanDto, UnderwritingQueryDto } from './dto/predictive-intelligence.dto';

@ApiTags('Predictive Intelligence')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard)
@Controller('predictive')
export class PredictiveIntelligenceController {
  constructor(private readonly svc: PredictiveIntelligenceService) {}

  @Get('users/:userId/predictions')
  @ApiOperation({ summary: 'Full predictive intelligence snapshot for a user', description: 'Returns repayment probability, default risk, trust trajectory, and fraud probability forecasts.' })
  @ApiParam({ name: 'userId' })
  getUserPredictions(@Param('userId') userId: string) {
    return this.svc.getUserPredictions(userId);
  }

  @Get('users/:userId/underwriting')
  @ApiOperation({ summary: 'AI-assisted underwriting recommendation', description: 'Generates recommended loan amount, duration, interest adjustment, and confidence score based on behavioral signals.' })
  @ApiParam({ name: 'userId' })
  getUnderwriting(@Param('userId') userId: string, @Query() q: UnderwritingQueryDto) {
    return this.svc.getUnderwritingRecommendation(userId, q.groupId);
  }

  @Get('users/:userId/recommendations')
  @ApiOperation({ summary: 'Personalized financial recommendations', description: 'Contextual behavioral recommendations: repayment improvement, savings targets, risk mitigation, growth opportunities.' })
  @ApiParam({ name: 'userId' })
  getRecommendations(@Param('userId') userId: string) {
    return this.svc.getRecommendations(userId);
  }

  @Get('users/:userId/predictions/history')
  @ApiOperation({ summary: 'Historical prediction snapshots for a user' })
  @ApiParam({ name: 'userId' })
  @ApiQuery({ name: 'type', enum: ['DEFAULT_RISK','REPAYMENT_SUCCESS','TRUST_EVOLUTION','FRAUD_PROBABILITY','TREASURY_STABILITY','LIQUIDITY_FORECAST','COOPERATIVE_RISK'] })
  getPredictionHistory(@Param('userId') userId: string, @Query('type') type: string) {
    return this.svc.getPredictionHistory(userId, type);
  }

  @Get('treasury/:groupId/forecast')
  @ApiOperation({ summary: 'Autonomous treasury sustainability forecast', description: 'Projects 30/90-day treasury balance, depletion risk, reserve adequacy, and lending capacity.' })
  @ApiParam({ name: 'groupId' })
  getTreasuryForecast(@Param('groupId') groupId: string) {
    return this.svc.getTreasuryForecast(groupId);
  }

  @Get('treasury/:groupId/recommendations')
  @ApiOperation({ summary: 'Treasury optimization recommendations' })
  @ApiParam({ name: 'groupId' })
  getTreasuryRecommendations(@Param('groupId') groupId: string) {
    return this.svc.getTreasuryRecommendations(groupId);
  }

  @Post('simulate/loan')
  @ApiOperation({ summary: 'Loan scenario simulation', description: 'Simulates treasury impact, liquidity pressure, and repayment outcomes for a proposed loan.' })
  simulateLoan(@Body() dto: SimulateLoanDto) {
    return this.svc.simulateLoan(dto);
  }

  @Post('autonomous/users/:userId/adapt')
  @ApiOperation({ summary: 'Trigger autonomous adaptation for a user', description: 'Runs trust and fraud adaptation — adjusts risk levels, wallet restrictions, and loan eligibility autonomously.' })
  @ApiParam({ name: 'userId' })
  adaptUser(@Param('userId') userId: string) {
    return this.svc.runAutonomousAdaptation(userId);
  }

  @Post('autonomous/treasury/:groupId/adapt')
  @ApiOperation({ summary: 'Trigger autonomous treasury adaptation', description: 'Evaluates treasury health and autonomously adjusts lending pool, reserve thresholds, and emits governance alerts.' })
  @ApiParam({ name: 'groupId' })
  adaptTreasury(@Param('groupId') groupId: string) {
    return this.svc.runTreasuryAdaptation(groupId);
  }

  @Get('analytics/portfolio')
  @ApiOperation({ summary: 'Predictive portfolio health report', description: 'Investor-grade report: average trust, default risk, repayment outlook, trajectory distribution, portfolio health score.' })
  getPortfolioReport() {
    return this.svc.getPortfolioReport();
  }

  @Get('analytics/treasury')
  @ApiOperation({ summary: 'Cooperative treasury portfolio report', description: 'Aggregate treasury sustainability, critical group count, total lending capacity.' })
  getTreasuryReport() {
    return this.svc.getTreasuryReport();
  }
}
