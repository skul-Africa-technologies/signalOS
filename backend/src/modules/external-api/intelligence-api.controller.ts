import { Body, Controller, Get, Param, Post, UseGuards, Request } from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { ApiKeyGuard } from './guards/api-key.guard';
import { RequireScopes } from './decorators/require-scopes.decorator';
import { OrgContext } from './decorators/org-context.decorator';
import { ConsentService } from './consent.service';
import { AuditService } from './audit.service';
import { IntelligenceApiService } from './intelligence-api.service';
import { TrustScoreRequestDto, LoanEligibilityRequestDto, FraudAnalysisRequestDto } from './dto/intelligence.dto';
import { Organization } from '@prisma/client';

@ApiTags('External Intelligence APIs')
@ApiSecurity('x-api-key')
@ApiHeader({ name: 'x-api-key', description: 'Organization API key', required: true })
@UseGuards(ApiKeyGuard)
@Controller('api/v1/external')
export class IntelligenceApiController {
  constructor(
    private readonly intel: IntelligenceApiService,
    private readonly consent: ConsentService,
    private readonly audit: AuditService,
  ) {}

  @Post('trust-score/evaluate')
  @RequireScopes('trust:read')
  @ApiOperation({ summary: 'Evaluate behavioral trust score for a user', description: 'Returns trust score, risk level, and behavioral confidence. Requires active user consent.' })
  async trustScore(
    @Body() dto: TrustScoreRequestDto,
    @OrgContext() org: Organization,
    @Request() req: any,
  ) {
    await this.consent.verifyConsent(dto.userId, org.id, ['trust:read']);
    const result = await this.intel.getTrustScore(dto.userId);
    await this.audit.log({ organizationId: org.id, endpoint: 'trust-score/evaluate', userId: dto.userId, scopesUsed: ['trust:read'], purpose: dto.purpose, ipAddress: req.ip, responseStatus: 200 });
    return result;
  }

  @Get('financial-identity/:userId')
  @RequireScopes('identity:read')
  @ApiOperation({ summary: 'Get financial identity profile for a user', description: 'Returns derived behavioral economic identity. No raw financial data exposed.' })
  async financialIdentity(
    @Param('userId') userId: string,
    @OrgContext() org: Organization,
    @Request() req: any,
  ) {
    await this.consent.verifyConsent(userId, org.id, ['identity:read']);
    const result = await this.intel.getFinancialIdentity(userId);
    await this.audit.log({ organizationId: org.id, endpoint: 'financial-identity', userId, scopesUsed: ['identity:read'], purpose: 'identity_check', ipAddress: req.ip, responseStatus: 200 });
    return result;
  }

  @Post('loan-eligibility/check')
  @RequireScopes('loan:read')
  @ApiOperation({ summary: 'Check loan eligibility using behavioral underwriting', description: 'Returns eligibility, recommended amount, duration, and default probability.' })
  async loanEligibility(
    @Body() dto: LoanEligibilityRequestDto,
    @OrgContext() org: Organization,
    @Request() req: any,
  ) {
    await this.consent.verifyConsent(dto.userId, org.id, ['loan:read']);
    const result = await this.intel.getLoanEligibility(dto.userId);
    await this.audit.log({ organizationId: org.id, endpoint: 'loan-eligibility/check', userId: dto.userId, scopesUsed: ['loan:read'], purpose: dto.purpose, ipAddress: req.ip, responseStatus: 200 });
    return result;
  }

  @Get('cooperative/:groupId/health')
  @RequireScopes('cooperative:read')
  @ApiOperation({ summary: 'Get cooperative treasury health intelligence', description: 'Returns group trust score, treasury health, contribution consistency, and sustainability metrics.' })
  async cooperativeHealth(
    @Param('groupId') groupId: string,
    @OrgContext() org: Organization,
    @Request() req: any,
  ) {
    const result = await this.intel.getCooperativeHealth(groupId);
    await this.audit.log({ organizationId: org.id, endpoint: `cooperative/${groupId}/health`, userId: undefined, scopesUsed: ['cooperative:read'], purpose: 'cooperative_assessment', ipAddress: req.ip, responseStatus: 200 });
    return result;
  }

  @Get('activity/:userId')
  @RequireScopes('activity:read')
  @ApiOperation({ summary: 'Get economic activity and stability metrics for a user', description: 'Returns derived behavioral metrics. No raw transaction data exposed.' })
  async activity(
    @Param('userId') userId: string,
    @OrgContext() org: Organization,
    @Request() req: any,
  ) {
    await this.consent.verifyConsent(userId, org.id, ['activity:read']);
    const result = await this.intel.getActivity(userId);
    await this.audit.log({ organizationId: org.id, endpoint: `activity/${userId}`, userId, scopesUsed: ['activity:read'], purpose: 'activity_check', ipAddress: req.ip, responseStatus: 200 });
    return result;
  }

  @Post('fraud/analyze')
  @RequireScopes('fraud:read')
  @ApiOperation({ summary: 'Analyze fraud risk for a user', description: 'Returns fraud risk level, suspicious patterns, and confidence score.' })
  async fraudAnalysis(
    @Body() dto: FraudAnalysisRequestDto,
    @OrgContext() org: Organization,
    @Request() req: any,
  ) {
    await this.consent.verifyConsent(dto.userId, org.id, ['fraud:read']);
    const result = await this.intel.analyzeFraud(dto.userId);
    await this.audit.log({ organizationId: org.id, endpoint: 'fraud/analyze', userId: dto.userId, scopesUsed: ['fraud:read'], purpose: dto.purpose, ipAddress: req.ip, responseStatus: 200 });
    return result;
  }
}
