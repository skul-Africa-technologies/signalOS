import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Query,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { GroupWalletService } from './group-wallet.service';
import { GroupLedgerService } from './group-ledger.service';
import { GroupLoanService } from './group-loan.service';
import { CooperativeTreasuryService } from './cooperative-treasury.service';
import { IssueGroupLoanDto, RepayGroupLoanDto } from './dto/group-loan.dto';

@ApiTags('Cooperative Treasury')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard)
@Controller('cooperative')
export class CooperativeController {
  constructor(
    private readonly groupWallet: GroupWalletService,
    private readonly groupLedger: GroupLedgerService,
    private readonly groupLoan: GroupLoanService,
    private readonly treasury: CooperativeTreasuryService,
  ) {}

  // ─── Treasury Wallet ──────────────────────────────────────────────────────

  @Get('groups/:groupId/treasury')
  @ApiParam({ name: 'groupId', description: 'Savings group ID' })
  @ApiOperation({
    summary: 'Get group treasury wallet',
    description:
      'Returns the pooled cooperative treasury wallet including available balance, reserve balance, lending pool balance, and cumulative totals. This is the financial backbone of the cooperative.',
  })
  @ApiResponse({ status: 200, description: 'Treasury wallet balances returned' })
  @ApiResponse({ status: 404, description: 'Group wallet not found' })
  getTreasury(@Param('groupId') groupId: string) {
    return this.groupWallet.getWallet(groupId);
  }

  // ─── Treasury Health & Analytics ─────────────────────────────────────────

  @Get('groups/:groupId/treasury/health')
  @ApiParam({ name: 'groupId', description: 'Savings group ID' })
  @ApiOperation({
    summary: 'Get treasury health analytics',
    description:
      'Evaluates the cooperative treasury health in real time. Returns treasury balance, reserve ratio (target ≥ 0.20), lending capacity, active loan count, and a sustainability score (0–100). A snapshot is persisted for longitudinal tracking.',
  })
  @ApiResponse({
    status: 200,
    description: 'Treasury health metrics',
    schema: {
      example: {
        groupId: 'clx...',
        treasuryBalance: 850000,
        reserveRatio: 0.22,
        lendingCapacity: 300000,
        activeLoans: 6,
        sustainabilityScore: 81,
        memberCount: 12,
      },
    },
  })
  getTreasuryHealth(@Param('groupId') groupId: string) {
    return this.treasury.getHealth(groupId);
  }

  // ─── Immutable Ledger ─────────────────────────────────────────────────────

  @Get('groups/:groupId/treasury/ledger')
  @ApiParam({ name: 'groupId', description: 'Savings group ID' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Max entries to return (default 50)' })
  @ApiQuery({ name: 'offset', required: false, type: Number, description: 'Pagination offset (default 0)' })
  @ApiOperation({
    summary: 'Get immutable group treasury ledger',
    description:
      'Returns the append-only cooperative ledger — the authoritative source of truth for all treasury activity. Entries are never edited or deleted. Categories include MEMBER_CONTRIBUTION, GROUP_LOAN_DISBURSEMENT, GROUP_LOAN_REPAYMENT, ROTATIONAL_PAYOUT, MEMBER_WITHDRAWAL, TREASURY_RESERVE, and TREASURY_ADJUSTMENT.',
  })
  @ApiResponse({ status: 200, description: 'Ledger entries returned in reverse chronological order' })
  async getTreasuryLedger(
    @Param('groupId') groupId: string,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
    @Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset: number,
  ) {
    const wallet = await this.groupWallet.getWallet(groupId);
    return this.groupLedger.getGroupLedger(wallet.id, limit, offset);
  }

  // ─── Group Economic Profile ───────────────────────────────────────────────

  @Get('groups/:groupId/treasury/profile')
  @ApiParam({ name: 'groupId', description: 'Savings group ID' })
  @ApiOperation({
    summary: 'Get group economic intelligence profile',
    description:
      'Returns the cooperative group economic profile including treasury health score, group reliability, contribution consistency, repayment performance, member participation quality, liquidity stability, and lending sustainability. The profile is recalculated on each call and persisted for intelligence tracking.',
  })
  @ApiResponse({
    status: 200,
    description: 'Group economic profile',
    schema: {
      example: {
        groupId: 'clx...',
        treasuryHealth: 81,
        groupReliability: 90,
        contributionConsistency: 75,
        repaymentPerformance: 88,
        memberParticipation: 70,
        liquidityStability: 22,
        lendingSustainability: 80,
        sustainabilityScore: 81,
        reserveRatio: 0.22,
      },
    },
  })
  async getGroupProfile(@Param('groupId') groupId: string) {
    await this.treasury.updateGroupProfile(groupId);
    return this.treasury.getGroupEconomicProfile(groupId);
  }

  // ─── Group Loans ──────────────────────────────────────────────────────────

  @Post('groups/:groupId/loans/issue')
  @ApiParam({ name: 'groupId', description: 'Savings group ID' })
  @ApiOperation({
    summary: 'Issue a treasury-backed group loan',
    description:
      'Disburses a cooperative loan funded directly from the group lending pool. Atomically debits the group treasury, credits the member wallet, creates ledger entries on both sides, and emits a group.loan.disbursed event. Validates membership, active loan conflicts, and pool liquidity before disbursement.',
  })
  @ApiResponse({ status: 201, description: 'Loan disbursed successfully' })
  @ApiResponse({ status: 400, description: 'Insufficient lending pool or member already has active loan' })
  @ApiResponse({ status: 403, description: 'Borrower is not a group member' })
  issueGroupLoan(
    @Param('groupId') groupId: string,
    @Body() dto: IssueGroupLoanDto,
  ) {
    return this.groupLoan.disburse(groupId, dto.borrowerId, dto.amount);
  }

  @Post('loans/:loanId/repay')
  @ApiParam({ name: 'loanId', description: 'Group loan ID' })
  @ApiOperation({
    summary: 'Repay a group loan',
    description:
      'Processes a repayment against an active group loan. Replenishes the group treasury lending pool atomically, creates a GROUP_LOAN_REPAYMENT ledger entry, and emits a group.loan.repaid event. Supports partial repayments — the loan status transitions to REPAID only when fully settled.',
  })
  @ApiResponse({ status: 200, description: 'Repayment processed', schema: { example: { loanId: 'clx...', repaidAmount: 10000, fullyRepaid: true } } })
  @ApiResponse({ status: 400, description: 'Loan is not active' })
  @ApiResponse({ status: 404, description: 'Loan not found' })
  repayGroupLoan(
    @Param('loanId') loanId: string,
    @Body() dto: RepayGroupLoanDto,
  ) {
    return this.groupLoan.repay(loanId, dto.amount);
  }

  @Get('groups/:groupId/loans')
  @ApiParam({ name: 'groupId', description: 'Savings group ID' })
  @ApiOperation({
    summary: 'Get all group loans',
    description: 'Returns all loans issued from the group treasury, including active, repaid, and defaulted loans.',
  })
  getGroupLoans(@Param('groupId') groupId: string) {
    return this.groupLoan.getGroupLoans(groupId);
  }

  @Get('my-loans')
  @ApiOperation({
    summary: 'Get my group loans',
    description: 'Returns all group loans issued to the authenticated member across all cooperative groups.',
  })
  getMyLoans(@CurrentUser('sub') userId: string) {
    return this.groupLoan.getMemberLoans(userId);
  }
}
