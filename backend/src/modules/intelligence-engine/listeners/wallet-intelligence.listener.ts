import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { IntelligenceEngineService } from '../intelligence-engine.service';

@Injectable()
export class WalletIntelligenceListener {
  private readonly logger = new Logger(WalletIntelligenceListener.name);

  constructor(private readonly engine: IntelligenceEngineService) {}

  @OnEvent('wallet.credited', { async: true })
  async handleWalletCredited(payload: { userId: string; amount: number; category: string }) {
    this.logger.log(`wallet.credited → re-analysing user ${payload.userId}`);
    await this.engine.analyseUser(payload.userId).catch((err) =>
      this.logger.error(`Intelligence re-analysis failed: ${err.message}`),
    );
  }

  @OnEvent('loan.disbursed', { async: true })
  async handleLoanDisbursed(payload: { userId: string }) {
    this.logger.log(`loan.disbursed → re-analysing user ${payload.userId}`);
    await this.engine.analyseUser(payload.userId).catch((err) =>
      this.logger.error(`Intelligence re-analysis failed: ${err.message}`),
    );
  }

  @OnEvent('withdrawal.requested', { async: true })
  async handleWithdrawalRequested(payload: { userId: string }) {
    this.logger.log(`withdrawal.requested → re-analysing user ${payload.userId}`);
    await this.engine.analyseUser(payload.userId).catch((err) =>
      this.logger.error(`Intelligence re-analysis failed: ${err.message}`),
    );
  }
}
