import { Controller, Get, Post, Patch, Body, UseGuards, HttpCode, HttpStatus, Version } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { KycService } from './kyc.service';
import { SubmitBvnDto, SubmitNinDto, SubmitDocumentDto, ReviewKycDto } from './dto/kyc.dto';

/** v1 — original contract */
@ApiTags('KYC & Identity Verification')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard)
@Controller({ path: 'kyc', version: '1' })
export class KycController {
  constructor(private readonly kyc: KycService) {}

  @Get('profile')
  @ApiOperation({ summary: 'Get KYC profile and verification status' })
  getProfile(@CurrentUser() user: { id: string }) {
    return this.kyc.getOrCreateProfile(user.id);
  }

  @Post('bvn')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Submit BVN for verification' })
  @ApiResponse({ status: 200, description: 'BVN submitted for verification' })
  submitBvn(@CurrentUser() user: { id: string }, @Body() dto: SubmitBvnDto) {
    return this.kyc.submitBvn(user.id, dto);
  }

  @Post('nin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Submit NIN for verification' })
  submitNin(@CurrentUser() user: { id: string }, @Body() dto: SubmitNinDto) {
    return this.kyc.submitNin(user.id, dto);
  }

  @Post('document')
  @ApiOperation({ summary: 'Submit KYC document (selfie, ID, etc.)' })
  @ApiResponse({ status: 201, description: 'Document submitted for review' })
  submitDocument(@CurrentUser() user: { id: string }, @Body() dto: SubmitDocumentDto) {
    return this.kyc.submitDocument(user.id, dto);
  }

  @Patch('review')
  @ApiOperation({ summary: 'Admin: Review and update KYC status' })
  reviewKyc(@CurrentUser() user: { id: string }, @Body() dto: ReviewKycDto) {
    return this.kyc.reviewKyc(user.id, dto);
  }

  @Get('risk-scan')
  @ApiOperation({ summary: 'Run identity risk scan for current user' })
  riskScan(@CurrentUser() user: { id: string }) {
    return this.kyc.runRiskScan(user.id);
  }
}

/** v2 — enriched response envelope with compliance metadata */
@ApiTags('KYC & Identity Verification')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard)
@Controller({ path: 'kyc', version: '2' })
export class KycV2Controller {
  constructor(private readonly kyc: KycService) {}

  @Get('profile')
  @ApiOperation({ summary: '[v2] Get KYC profile with compliance metadata envelope' })
  async getProfile(@CurrentUser() user: { id: string }) {
    const profile = await this.kyc.getOrCreateProfile(user.id);
    return {
      data: profile,
      meta: {
        apiVersion: '2',
        complianceFramework: 'CBN-KYC-2024',
        verificationLevels: ['NONE', 'BASIC', 'INTERMEDIATE', 'FULL'],
        timestamp: new Date().toISOString(),
      },
    };
  }

  @Post('bvn')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '[v2] Submit BVN — returns enriched verification result' })
  async submitBvn(@CurrentUser() user: { id: string }, @Body() dto: SubmitBvnDto) {
    const result = await this.kyc.submitBvn(user.id, dto);
    return { data: result, meta: { apiVersion: '2', timestamp: new Date().toISOString() } };
  }

  @Post('nin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '[v2] Submit NIN — returns enriched verification result' })
  async submitNin(@CurrentUser() user: { id: string }, @Body() dto: SubmitNinDto) {
    const result = await this.kyc.submitNin(user.id, dto);
    return { data: result, meta: { apiVersion: '2', timestamp: new Date().toISOString() } };
  }

  @Post('document')
  @ApiOperation({ summary: '[v2] Submit KYC document' })
  async submitDocument(@CurrentUser() user: { id: string }, @Body() dto: SubmitDocumentDto) {
    const result = await this.kyc.submitDocument(user.id, dto);
    return { data: result, meta: { apiVersion: '2', timestamp: new Date().toISOString() } };
  }

  @Get('risk-scan')
  @ApiOperation({ summary: '[v2] Run identity risk scan with detailed breakdown' })
  async riskScan(@CurrentUser() user: { id: string }) {
    const result = await this.kyc.runRiskScan(user.id);
    return {
      data: result,
      meta: {
        apiVersion: '2',
        riskFramework: 'signalOS-IRE-v2',
        timestamp: new Date().toISOString(),
      },
    };
  }
}
