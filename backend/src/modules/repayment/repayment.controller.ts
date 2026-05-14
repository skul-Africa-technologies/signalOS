import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RepaymentService } from './repayment.service';
import { GenerateScheduleDto, MakeRepaymentDto } from './dto/repayment.dto';

@ApiTags('Repayment')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard)
@Controller('repayment')
export class RepaymentController {
  constructor(private readonly svc: RepaymentService) {}

  @Post('schedule/generate')
  @ApiOperation({ summary: 'Generate repayment schedule for a loan' })
  generateSchedule(@Body() dto: GenerateScheduleDto) {
    return this.svc.generateSchedule(dto);
  }

  @Get('schedule/:loanId')
  @ApiOperation({ summary: 'Get repayment schedule for a loan' })
  getSchedule(@Param('loanId') loanId: string) {
    return this.svc.getSchedule(loanId);
  }

  @Post('pay')
  @ApiOperation({ summary: 'Make a loan repayment from wallet' })
  pay(@Body() dto: MakeRepaymentDto, @CurrentUser() user: { id: string }) {
    return this.svc.processRepayment(user.id, dto);
  }

  @Get('history/:loanId')
  @ApiOperation({ summary: 'Get repayment history for a loan' })
  history(@Param('loanId') loanId: string) {
    return this.svc.getRepaymentHistory(loanId);
  }

  @Get('outstanding/:loanId')
  @ApiOperation({ summary: 'Get outstanding balance for a loan' })
  outstanding(@Param('loanId') loanId: string) {
    return this.svc.getOutstandingBalance(loanId);
  }

  @Get('intelligence')
  @ApiOperation({ summary: 'Get repayment intelligence for authenticated user' })
  intelligence(@CurrentUser() user: { id: string }) {
    return this.svc.getRepaymentIntelligence(user.id);
  }
}
