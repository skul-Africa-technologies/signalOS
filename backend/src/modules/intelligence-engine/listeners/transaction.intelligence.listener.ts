import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Transaction } from '@prisma/client';
import { INTELLIGENCE_EVENTS } from '../intelligence.constants';

// Listens to platform-wide payment/transaction events and routes them into the intelligence pipeline
@Injectable()
export class TransactionIntelligenceListener {
  private readonly logger = new Logger(TransactionIntelligenceListener.name);

  constructor(private readonly eventEmitter: EventEmitter2) {}

  @OnEvent('payment.success')
  async handlePaymentSuccess(payload: { userId: string; transaction: Transaction }): Promise<void> {
    this.logger.debug(`Routing payment.success for user ${payload.userId} to intelligence engine`);
    this.eventEmitter.emit(INTELLIGENCE_EVENTS.ANALYSE_USER, {
      userId: payload.userId,
      triggeredBy: 'payment',
      metadata: { transactionId: payload.transaction.id },
    });
  }

  @OnEvent('transaction.created')
  async handleTransactionCreated(payload: { userId: string; transaction: Transaction }): Promise<void> {
    this.logger.debug(`Routing transaction.created for user ${payload.userId} to intelligence engine`);
    this.eventEmitter.emit(INTELLIGENCE_EVENTS.ANALYSE_USER, {
      userId: payload.userId,
      triggeredBy: 'transaction',
    });
  }
}
