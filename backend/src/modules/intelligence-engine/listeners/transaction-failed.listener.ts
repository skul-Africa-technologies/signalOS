import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { Transaction } from '@prisma/client';
import { IntelligenceEngineService } from '../intelligence-engine.service';

@Injectable()
export class TransactionFailedListener {
  private readonly logger = new Logger(TransactionFailedListener.name);

  constructor(private readonly engine: IntelligenceEngineService) {}

  // Failed transactions reduce repayment consistency — recalculate immediately
  @OnEvent('transaction.failed', { async: true })
  async handle(payload: { userId: string; transaction: Transaction }): Promise<void> {
    this.logger.warn(`transaction.failed → re-analysing user ${payload.userId}`);
    await this.engine.analyseUser(payload.userId);
  }
}
