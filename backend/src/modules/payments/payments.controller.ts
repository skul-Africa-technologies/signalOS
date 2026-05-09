import { Controller, Post, Body, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { InitiatePaymentDto } from './dto/initiate-payment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { PaymentInitiateResponseDto, ErrorResponseDto } from '../../common/swagger/response.models';

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Post('initiate')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Initiate a Squad payment',
    description: 'Creates a payment session via Squad API and returns a checkout URL. On completion, Squad sends a webhook that triggers the intelligence pipeline: transaction persistence → signal extraction → trust score recalculation.',
  })
  @ApiResponse({ status: 201, description: 'Payment session created', type: PaymentInitiateResponseDto })
  @ApiResponse({ status: 400, description: 'Validation error', type: ErrorResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized', type: ErrorResponseDto })
  initiate(@CurrentUser('sub') userId: string, @Body() dto: InitiatePaymentDto) {
    return this.payments.initiate(userId, dto);
  }

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Squad payment webhook',
    description: 'Receives payment completion events from Squad. On `charge_completed` with `success` status: persists transaction, emits `payment.success` event → triggers ScoringListener (signal extraction + profile update) and TrustScoreListener (trust recalculation). Idempotent — duplicate webhooks are safely ignored.',
  })
  @ApiBody({ schema: { example: { Event: 'charge_completed', Body: { transaction_ref: 'sig_xxx', merchant_ref: 'sig_xxx', transaction_status: 'success', amount: 150000 } } } })
  @ApiResponse({ status: 200, description: 'Webhook acknowledged', schema: { example: { received: true } } })
  webhook(@Body() payload: Record<string, any>) {
    return this.payments.handleWebhook(payload);
  }
}
