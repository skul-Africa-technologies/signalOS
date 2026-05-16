import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { Transaction } from '@prisma/client';
import { LedgerCategory } from '../../common/prisma-enums';
import { WalletService } from './wallet.service';

@Injectable()
export class WalletPaymentListener {
  private readonly logger = new Logger(WalletPaymentListener.name);

  constructor(private readonly walletService: WalletService) {}

  @OnEvent('payment.success', { async: true })
  async handlePaymentSuccess(payload: { userId: string; transaction: Transaction }) {
    const { userId, transaction } = payload;
    this.logger.log(`payment.success → crediting wallet for user ${userId}`);

    try {
      await this.walletService.credit({
        userId,
        amount: transaction.amount,
        category: LedgerCategory.PAYMENT_RECEIVED,
        reference: `wallet_credit_${transaction.reference}`,
        metadata: { transactionId: transaction.id, source: 'payment.success' },
      });
    } catch (err: any) {
      this.logger.error(`Failed to credit wallet for user ${userId}: ${err.message}`);
    }
  }
}
