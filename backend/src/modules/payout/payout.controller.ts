import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { PayoutService } from './payout.service';
import { WithdrawDto } from './dto/withdraw.dto';

@ApiTags('Payouts & Withdrawals')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard)
@Controller('payout')
export class PayoutController {
  constructor(private readonly payoutService: PayoutService) {}

  @Post('withdraw')
  @ApiOperation({ summary: 'Request a withdrawal to bank account' })
  withdraw(@CurrentUser() user: { id: string }, @Body() dto: WithdrawDto) {
    return this.payoutService.requestWithdrawal(user.id, dto);
  }

  @Get('withdrawals')
  @ApiOperation({ summary: 'Get withdrawal history' })
  getWithdrawals(@CurrentUser() user: { id: string }) {
    return this.payoutService.getWithdrawals(user.id);
  }

  @Get('payouts')
  @ApiOperation({ summary: 'Get payout history' })
  getPayouts(@CurrentUser() user: { id: string }) {
    return this.payoutService.getPayouts(user.id);
  }

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Squad payout webhook handler' })
  handleWebhook(@Body() payload: Record<string, any>) {
    return this.payoutService.handlePayoutWebhook(payload);
  }
}
