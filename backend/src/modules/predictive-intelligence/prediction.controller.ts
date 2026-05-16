import { Controller, Get, Post, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RepaymentPredictionEngine, TrustEvolutionEngine, FraudProbabilityEngine } from './engines/prediction.engines';
import { TreasuryForecastEngine } from './engines/treasury-forecast.engine';
import { UnderwritingEngine, RecommendationEngine } from './engines/underwriting.engine';
import { PredictiveAnalyticsService } from './analytics/predictive-analytics.service';
import { AutonomousAdaptationService } from './autonomous/autonomous-adaptation.service';
import { PredictionStoreService } from './store/prediction-store.service';
import { SimulateLoanDto, UnderwriteDto } from './dto/prediction.dto';

@ApiTags('Predictive Intelligence')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'predictions', version: '1' })
export class PredictionController {
  constructor(
    private readonly repaymentEngine: RepaymentPredictionEngine,
    private readonly trustEngine: TrustEvolutionEngine,
    private readonly fraudEngine: FraudProbabilityEngine,
    private readonly treasuryEngine: TreasuryForecastEngine,
    private readonly underwritingEngine: UnderwritingEngine,
    private readonly recommendationEngine: RecommendationEngine,
    private readonly analytics: PredictiveAnalyticsService,
    private readonly autonomy: AutonomousAdaptationService,
    private readonly store: PredictionStoreService,
  ) {}

  // ─── Repayment Prediction ────────────────────────────────────────────────────

  @Get('repayment')
  @ApiOperation({
    summary: 'Predict repayment probability',
    description: 'AI-assisted behavioral analysis forecasting repayment success, default risk, and late payment probability based on trust velocity, wallet liquidity, and repayment history.',
  })
  @ApiResponse({ status: 200, description: 'Repayment prediction with confidence scoring and risk factors' })
  async predictRepayment(@Request() req: any) {
    return this.repaymentEngine.predict(req.user.id);
  }

  @Get('repayment/:userId')
  @ApiOperation({ summary: 'Predict repayment for a specific user (admin)' })
  @ApiParam({ name: 'userId', description: 'Target user ID' })
  async predictRepaymentForUser(@Param('userId') userId: string) {
    return this.repaymentEngine.predict(userId);
  }

  // ─── Trust Evolution Forecast ────────────────────────────────────────────────

  @Get('trust-evolution')
  @ApiOperation({
    summary: 'Forecast trust score trajectory',
    description: 'Longitudinal behavioral intelligence forecasting 30-day and 90-day trust evolution. Identifies POSITIVE, STABLE, DECLINING, or CRITICAL trajectories.',
  })
  @ApiResponse({ status: 200, description: 'Trust trajectory forecast with predicted scores and behavioral drivers' })
  async forecastTrust(@Request() req: any) {
    return this.trustEngine.forecast(req.user.id);
  }

  @Get('trust-evolution/:userId')
  @ApiOperation({ summary: 'Forecast trust trajectory for a specific user (admin)' })
  async forecastTrustForUser(@Param('userId') userId: string) {
    return this.trustEngine.forecast(userId);
  }

  // ─── Fraud Probability Forecast ──────────────────────────────────────────────

  @Get('fraud-probability')
  @ApiOperation({
    summary: 'Forecast fraud probability',
    description: 'Predictive fraud intelligence analyzing anomaly trends, behavioral drift, velocity spikes, and coordinated abuse potential.',
  })
  @ApiResponse({ status: 200, description: 'Fraud probability forecast with anomaly signals' })
  async forecastFraud(@Request() req: any) {
    return this.fraudEngine.forecast(req.user.id);
  }

  // ─── Treasury Forecast ───────────────────────────────────────────────────────

  @Get('treasury/:groupId')
  @ApiOperation({
    summary: 'Forecast cooperative treasury sustainability',
    description: 'Treasury simulation forecasting 30-day and 90-day balance projections, depletion risk, lending capacity, and reserve adequacy for cooperative groups.',
  })
  @ApiParam({ name: 'groupId', description: 'Cooperative group ID' })
  @ApiResponse({ status: 200, description: 'Treasury forecast with liquidity intelligence and reserve adequacy assessment' })
  async forecastTreasury(@Param('groupId') groupId: string) {
    return this.treasuryEngine.forecast(groupId);
  }

  // ─── AI-Assisted Underwriting ────────────────────────────────────────────────

  @Post('underwrite')
  @ApiOperation({
    summary: 'AI-assisted loan underwriting',
    description: 'Generates recommended loan amount, duration, interest adjustment, and risk-adjusted rate using behavioral trust intelligence, repayment predictions, and treasury health.',
  })
  @ApiResponse({ status: 201, description: 'Underwriting recommendation with confidence score and reasoning' })
  async underwrite(@Request() req: any, @Body() dto: UnderwriteDto) {
    return this.underwritingEngine.underwrite(req.user.id, dto.groupId);
  }

  @Post('underwrite/:userId')
  @ApiOperation({ summary: 'Underwrite for a specific user (admin)' })
  async underwriteForUser(@Param('userId') userId: string, @Body() dto: UnderwriteDto) {
    return this.underwritingEngine.underwrite(userId, dto.groupId);
  }

  // ─── Loan Simulation ─────────────────────────────────────────────────────────

  @Post('simulate')
  @ApiOperation({
    summary: 'Simulate loan scenario',
    description: 'Financial scenario simulation projecting repayment outcomes, treasury impact, and liquidity pressure. Enables stress testing: "What happens if treasury utilization increases by 40%?"',
  })
  @ApiResponse({ status: 201, description: 'Simulation result with risk score, liquidity pressure, and recommendation' })
  async simulate(@Request() req: any, @Body() dto: SimulateLoanDto) {
    return this.underwritingEngine.simulate({
      userId: req.user.id,
      groupId: dto.groupId,
      loanAmount: dto.loanAmount,
      durationMonths: dto.durationMonths,
    });
  }

  // ─── Intelligent Recommendations ─────────────────────────────────────────────

  @Get('recommendations')
  @ApiOperation({
    summary: 'Get personalized financial recommendations',
    description: 'Contextual AI-generated recommendations for repayment improvement, savings optimization, risk mitigation, and growth opportunities based on live prediction data.',
  })
  @ApiResponse({ status: 200, description: 'Prioritized financial recommendations with actionable steps and estimated impact' })
  async getRecommendations(@Request() req: any) {
    return this.recommendationEngine.generate(req.user.id);
  }

  @Get('recommendations/treasury/:groupId')
  @ApiOperation({
    summary: 'Get treasury optimization recommendations',
    description: 'Cooperative treasury recommendations for reserve management, lending threshold adjustments, and sustainability improvements.',
  })
  async getTreasuryRecommendations(@Param('groupId') groupId: string) {
    return this.recommendationEngine.generateForTreasury(groupId);
  }

  // ─── Prediction History ───────────────────────────────────────────────────────

  @Get('history/:type')
  @ApiOperation({
    summary: 'Get prediction history',
    description: 'Retrieve historical prediction snapshots for longitudinal analysis. Types: DEFAULT_RISK, REPAYMENT_SUCCESS, TRUST_EVOLUTION, FRAUD_PROBABILITY, TREASURY_STABILITY, LIQUIDITY_FORECAST, COOPERATIVE_RISK',
  })
  @ApiParam({ name: 'type', description: 'Prediction type', enum: ['DEFAULT_RISK', 'REPAYMENT_SUCCESS', 'TRUST_EVOLUTION', 'FRAUD_PROBABILITY', 'TREASURY_STABILITY', 'LIQUIDITY_FORECAST', 'COOPERATIVE_RISK'] })
  async getPredictionHistory(@Request() req: any, @Param('type') type: string) {
    return this.store.getHistory(req.user.id, type as any, 30);
  }

  // ─── Portfolio Analytics ──────────────────────────────────────────────────────

  @Get('analytics/portfolio')
  @ApiOperation({
    summary: 'Generate predictive portfolio report',
    description: 'Investor-grade portfolio intelligence: average trust scores, default risk distribution, repayment outlook, trajectory analysis, and portfolio health score.',
  })
  @ApiResponse({ status: 200, description: 'Portfolio health report with repayment outlook and risk distribution' })
  async getPortfolioReport() {
    return this.analytics.generatePortfolioReport();
  }

  @Get('analytics/treasury')
  @ApiOperation({
    summary: 'Generate treasury portfolio report',
    description: 'Executive treasury intelligence: cooperative sustainability scores, critical treasury count, total lending capacity, and portfolio stability assessment.',
  })
  @ApiResponse({ status: 200, description: 'Treasury portfolio report with sustainability metrics' })
  async getTreasuryReport() {
    return this.analytics.generateTreasuryReport();
  }

  // ─── Autonomous Adaptation ────────────────────────────────────────────────────

  @Post('autonomous/adapt-treasury/:groupId')
  @ApiOperation({
    summary: 'Trigger autonomous treasury adaptation',
    description: 'Manually trigger autonomous treasury stress response. System evaluates depletion risk and self-adjusts lending pool, emitting governance events.',
  })
  async adaptTreasury(@Param('groupId') groupId: string) {
    await this.autonomy.adaptTreasury(groupId);
    return { message: 'Autonomous treasury adaptation triggered', groupId };
  }

  @Post('autonomous/adapt-fraud')
  @ApiOperation({
    summary: 'Trigger autonomous fraud adaptation',
    description: 'Evaluates current fraud probability and autonomously applies wallet restrictions if threshold exceeded.',
  })
  async adaptFraud(@Request() req: any) {
    await this.autonomy.adaptFraud(req.user.id);
    return { message: 'Autonomous fraud adaptation evaluated', userId: req.user.id };
  }
}
