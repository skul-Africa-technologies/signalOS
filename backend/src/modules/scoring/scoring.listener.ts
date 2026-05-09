import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PAYMENT_SUCCESS_EVENT } from '../payments/payments.service';
import { SignalExtractorService } from '../identity/signal-extractor.service';
import { IdentityService } from '../identity/identity.service';
import { Transaction } from '@prisma/client';

@Injectable()
export class ScoringListener {
  private readonly logger = new Logger(ScoringListener.name);

  constructor(
    private readonly signals: SignalExtractorService,
    private readonly identity: IdentityService,
  ) {}

  @OnEvent(PAYMENT_SUCCESS_EVENT)
  async handlePaymentSuccess(payload: { userId: string; transaction: Transaction }) {
    const { userId } = payload;

    const scores = await this.signals.extract(userId);
    await this.identity.updateScores(userId, scores);

    this.logger.log(
      `Scores updated for user ${userId}: trust=${scores.trustScore} reliability=${scores.reliabilityScore} liquidity=${scores.liquidityScore} employability=${scores.employabilityScore}`,
    );
  }
}
