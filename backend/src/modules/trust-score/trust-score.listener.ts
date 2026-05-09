import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { Transaction } from '@prisma/client';
import { PAYMENT_SUCCESS_EVENT } from '../payments/payments.service';
import { SAVINGS_CONTRIBUTION_EVENT } from '../savings/savings.service';
import { TrustScoreService } from './trust-score.service';

@Injectable()
export class TrustScoreListener {
  constructor(private readonly trustScore: TrustScoreService) {}

  @OnEvent(PAYMENT_SUCCESS_EVENT)
  handlePaymentSuccess(payload: { userId: string; transaction: Transaction }) {
    return this.trustScore.recalculate(payload.userId);
  }

  @OnEvent(SAVINGS_CONTRIBUTION_EVENT)
  handleSavingsContribution(payload: { userId: string }) {
    return this.trustScore.recalculate(payload.userId);
  }
}
