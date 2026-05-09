import { ApiProperty } from '@nestjs/swagger';

export class ErrorResponseDto {
  @ApiProperty({ example: 400 }) statusCode: number;
  @ApiProperty({ example: '2026-01-01T00:00:00.000Z' }) timestamp: string;
  @ApiProperty({ example: '/api/v1/auth/login' }) path: string;
  @ApiProperty({ example: 'Validation failed' }) message: string | string[];
}

export class UserDto {
  @ApiProperty({ example: 'cmo123abc' }) id: string;
  @ApiProperty({ example: 'Amara Okafor' }) name: string;
  @ApiProperty({ example: '+2348012345678' }) phone: string;
  @ApiProperty({ example: 'TRADER', enum: ['TRADER','ARTISAN','FREELANCER','VENDOR','OTHER'] }) businessType: string;
  @ApiProperty({ example: 76 }) trustScore: number;
  @ApiProperty({ example: '2026-01-01T00:00:00.000Z' }) createdAt: string;
}

export class AuthResponseDto {
  @ApiProperty({ type: UserDto }) user: UserDto;
  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiJ9...' }) accessToken: string;
}

export class TrustScoreDto {
  @ApiProperty({ example: 76 }) trustScore: number;
  @ApiProperty({ example: 'Low', enum: ['Low','Medium','High','Very High'] }) riskLevel: string;
  @ApiProperty({ example: ['Consistent transaction activity', 'Reliable savings participation'] }) reasons: string[];
  @ApiProperty({ example: { transactionConsistency: 100, paymentFrequency: 25, savingsReliability: 60, activityLevel: 100 } }) breakdown: Record<string, number>;
}

export class EconomicProfileDto {
  @ApiProperty({ example: 'cmo123abc' }) id: string;
  @ApiProperty({ example: 'cmo123abc' }) userId: string;
  @ApiProperty({ example: 76 }) trustScore: number;
  @ApiProperty({ example: 65 }) reliabilityScore: number;
  @ApiProperty({ example: 48 }) liquidityScore: number;
  @ApiProperty({ example: 55 }) employabilityScore: number;
  @ApiProperty({ example: 'Trader', nullable: true }) occupation: string | null;
  @ApiProperty({ example: 'Lagos', nullable: true }) location: string | null;
}

export class LoanEligibilityDto {
  @ApiProperty({ example: true }) eligible: boolean;
  @ApiProperty({ example: 180000, description: 'Maximum eligible loan amount in NGN' }) eligibleAmount: number;
  @ApiProperty({ example: 'Low', enum: ['Low','Medium','High','Very High'] }) riskLevel: string;
  @ApiProperty({ example: 'Eligible for micro expansion loan up to ₦180,000' }) recommendation: string;
  @ApiProperty({ example: 76 }) trustScore: number;
  @ApiProperty({ example: { transactionConsistency: 100, paymentFrequency: 25, savingsReliability: 60, activityLevel: 100 } }) breakdown: Record<string, number>;
  @ApiProperty({ example: ['Consistent transaction activity'] }) reasons: string[];
}

export class RecommendationDto {
  @ApiProperty({ example: 'loan', enum: ['loan','savings','growth'] }) type: string;
  @ApiProperty({ example: 'You qualify for a micro-loan' }) title: string;
  @ApiProperty({ example: 'Eligible for working capital loan up to ₦180,000' }) description: string;
  @ApiProperty({ example: 'high', enum: ['high','medium','low'] }) priority: string;
}

export class RecommendationSummaryDto {
  @ApiProperty({ type: LoanEligibilityDto }) eligibility: LoanEligibilityDto;
  @ApiProperty({ type: [RecommendationDto] }) recommendations: RecommendationDto[];
}

export class PaymentInitiateResponseDto {
  @ApiProperty({ example: 'sig_cmo123_1778331867454' }) reference: string;
  @ApiProperty({ example: 'https://pay.squadco.com/sig_cmo123_1778331867454' }) checkoutUrl: string;
  @ApiProperty({ description: 'Raw Squad API response' }) squadResponse: Record<string, any>;
}

export class TransactionDto {
  @ApiProperty({ example: 'cmo123abc' }) id: string;
  @ApiProperty({ example: 'sig_cmo123_1778331867454' }) reference: string;
  @ApiProperty({ example: 1500, description: 'Amount in NGN' }) amount: number;
  @ApiProperty({ example: 'NGN' }) currency: string;
  @ApiProperty({ example: 'CREDIT', enum: ['CREDIT','DEBIT','TRANSFER','SAVINGS'] }) type: string;
  @ApiProperty({ example: 'SUCCESS', enum: ['PENDING','SUCCESS','FAILED'] }) status: string;
  @ApiProperty({ example: '2026-01-01T00:00:00.000Z' }) createdAt: string;
}

export class SavingsGroupDto {
  @ApiProperty({ example: 'cmo123abc' }) id: string;
  @ApiProperty({ example: 'Market Women Coop' }) name: string;
  @ApiProperty({ example: 'Weekly savings group', nullable: true }) description: string | null;
  @ApiProperty({ example: 500000 }) targetAmount: number;
  @ApiProperty({ example: '2026-01-01T00:00:00.000Z' }) createdAt: string;
}

export class ContributionDto {
  @ApiProperty({ example: 'cmo123abc' }) id: string;
  @ApiProperty({ example: 'cmo123abc' }) userId: string;
  @ApiProperty({ example: 'cmo123abc' }) groupId: string;
  @ApiProperty({ example: 5000, description: 'Contribution amount in NGN' }) amount: number;
  @ApiProperty({ example: '2026-01-01T00:00:00.000Z' }) createdAt: string;
}

export class GroupAnalyticsDto {
  @ApiProperty({ type: SavingsGroupDto }) group: SavingsGroupDto;
  @ApiProperty({ example: 12 }) memberCount: number;
  @ApiProperty({ example: 75000 }) totalSaved: number;
  @ApiProperty({ example: 8 }) contributionCount: number;
  @ApiProperty({ example: 15, nullable: true, description: 'Progress toward target amount (%)' }) progress: number | null;
}
