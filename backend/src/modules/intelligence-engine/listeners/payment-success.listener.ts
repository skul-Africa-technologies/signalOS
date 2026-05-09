import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { Transaction } from '@prisma/client';
import { IntelligenceEngineService } from '../intelligence-engine.service';

@Injectable()
export class PaymentSuccessListener {
  private readonly logger = new Logger(PaymentSuccessListener.name);

  constructor(private readonly engine: IntelligenceEngineService) {}

  @OnEvent('payment.success', { async: true })
  async handle(payload: { userId: string; transaction: Transaction }): Promise<void> {
    this.logger.log(`payment.success → re-analysing user ${payload.userId}`);
    await this.engine.analyseUser(payload.userId);
  }
}
