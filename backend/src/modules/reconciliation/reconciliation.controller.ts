import { Body, Controller, Get, Param, Patch, Post, Query, Request, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { MismatchStatus } from '../../common/prisma-enums';
import { AdminGuard } from '../admin/guards/admin.guard';
import { RequirePermissions } from '../admin/decorators/permissions.decorator';
import { ReconciliationService } from './reconciliation.service';
import { ResolveMismatchDto } from './dto/reconciliation.dto';

@ApiTags('Reconciliation Engine')
@ApiSecurity('x-admin-token')
@UseGuards(AdminGuard)
@Controller('admin/reconciliation')
export class ReconciliationController {
  constructor(private readonly svc: ReconciliationService) {}

  // ─── Trigger Jobs ───────────────────────────────────────────────────────────

  @Post('run/provider')
  @ApiOperation({ summary: 'Trigger provider reconciliation (Squad vs internal ledger)' })
  @RequirePermissions('reconciliation.execute')
  runProvider() {
    return this.svc.runProviderReconciliation('squad');
  }

  @Post('run/ledger')
  @ApiOperation({ summary: 'Trigger ledger integrity scan (credits - debits = balance)' })
  @RequirePermissions('reconciliation.execute')
  runLedger() {
    return this.svc.runLedgerIntegrityScan();
  }

  @Post('run/treasury')
  @ApiOperation({ summary: 'Trigger treasury consistency check across all cooperative wallets' })
  @RequirePermissions('reconciliation.execute')
  runTreasury() {
    return this.svc.runTreasuryConsistencyCheck();
  }

  // ─── Query ──────────────────────────────────────────────────────────────────

  @Get('jobs')
  @ApiOperation({ summary: 'List all reconciliation jobs with pagination' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @RequirePermissions('reconciliation.execute')
  getJobs(@Query('page') page = '1', @Query('limit') limit = '20') {
    return this.svc.getJobs(+page, +limit);
  }

  @Get('mismatches/open')
  @ApiOperation({ summary: 'List all open (unresolved) mismatches across all jobs' })
  @ApiQuery({ name: 'page', required: false })
  @RequirePermissions('reconciliation.execute')
  openMismatches(@Query('page') page = '1') {
    return this.svc.getOpenMismatches(+page);
  }

  @Get('jobs/:jobId/mismatches')
  @ApiOperation({ summary: 'List mismatches for a specific reconciliation job' })
  @ApiQuery({ name: 'status', enum: MismatchStatus, required: false })
  @RequirePermissions('reconciliation.execute')
  getMismatches(@Param('jobId') jobId: string, @Query('status') status?: MismatchStatus) {
    return this.svc.getMismatches(jobId, status);
  }

  // ─── Resolution ─────────────────────────────────────────────────────────────

  @Patch('mismatches/:id/resolve')
  @ApiOperation({ summary: 'Resolve a reconciliation mismatch with admin notes' })
  @RequirePermissions('reconciliation.execute')
  resolve(@Param('id') id: string, @Body() dto: ResolveMismatchDto, @Request() req: any) {
    return this.svc.resolveMismatch(id, dto.resolutionNotes, req.admin.id);
  }

  @Patch('mismatches/:id/escalate')
  @ApiOperation({ summary: 'Escalate a mismatch for senior review' })
  @RequirePermissions('reconciliation.execute')
  escalate(@Param('id') id: string) {
    return this.svc.escalateMismatch(id);
  }
}
