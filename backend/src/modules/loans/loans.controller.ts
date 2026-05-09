import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { LoansService } from './loans.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { LoanEligibilityDto, ErrorResponseDto } from '../../common/swagger/response.models';

@ApiTags('Loan Eligibility')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard)
@Controller('loans')
export class LoansController {
  constructor(private readonly loans: LoansService) {}

  @Post('evaluate')
  @ApiOperation({
    summary: 'Evaluate loan eligibility',
    description: `Runs a full behavioral credit assessment using the trust score engine.

**Eligibility thresholds:**
- Trust score < 40 → Not eligible
- Trust score 40–49 → High risk, up to ₦75,000
- Trust score 50–69 → Medium risk, up to ₦200,000
- Trust score ≥ 70 → Low risk, up to ₦500,000

Result is persisted and returned with full explainability breakdown.`,
  })
  @ApiResponse({ status: 201, description: 'Eligibility evaluated', type: LoanEligibilityDto })
  @ApiResponse({ status: 401, description: 'Unauthorized', type: ErrorResponseDto })
  evaluate(@CurrentUser('sub') userId: string) {
    return this.loans.evaluate(userId);
  }

  @Get('eligibility')
  @ApiOperation({ summary: 'Get cached loan eligibility', description: 'Returns the most recently evaluated loan eligibility. If no evaluation exists, triggers a fresh evaluation.' })
  @ApiResponse({ status: 200, description: 'Loan eligibility record', type: LoanEligibilityDto })
  @ApiResponse({ status: 401, description: 'Unauthorized', type: ErrorResponseDto })
  getEligibility(@CurrentUser('sub') userId: string) {
    return this.loans.getEligibility(userId);
  }
}
