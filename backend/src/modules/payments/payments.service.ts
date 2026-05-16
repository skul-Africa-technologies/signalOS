import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { TransactionStatus, TransactionType } from '../../common/prisma-enums';
import { SquadService } from './squad.service';
import { TransactionsService } from '../transactions/transactions.service';
import { InitiatePaymentDto } from './dto/initiate-payment.dto';

export const PAYMENT_SUCCESS_EVENT = 'payment.success';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly squad: SquadService,
    private readonly transactions: TransactionsService,
    private readonly events: EventEmitter2,
  ) {}

  async initiate(userId: string, dto: InitiatePaymentDto) {
    const reference = `sig_${userId}_${Date.now()}`;

    const squadResponse = await this.squad.initializePayment({
      email: dto.email,
      amount: dto.amount,
      initiateType: 'inline',
      currency: 'NGN',
      transactionRef: reference,
      callbackUrl: dto.callbackUrl,
    });

    await this.transactions.create({
      userId,
      reference,
      amount: dto.amount / 100, // store in naira
      type: TransactionType.CREDIT,
      currency: 'NGN',
    });

    return { reference, checkoutUrl: squadResponse?.data?.checkout_url, squadResponse };
  }

  async handleWebhook(payload: Record<string, any>) {
    const event: string = payload?.Event ?? payload?.event;
    const body = payload?.Body ?? payload?.body ?? payload;

    if (event !== 'charge_completed' && event !== 'payment.success') {
      return { received: true };
    }

    const squadReference: string = body?.transaction_ref ?? body?.transactionRef;
    const internalRef: string = body?.merchant_ref ?? body?.merchantRef ?? squadReference;
    const status: string = body?.transaction_status ?? body?.status;

    if (!squadReference) return { received: true };

    // Idempotency: skip if already processed
    const existing = await this.transactions.findBySquadReference(squadReference);
    if (existing?.status === TransactionStatus.SUCCESS) return { received: true };

    const tx = await this.transactions.findByReference(internalRef);
    if (!tx) {
      this.logger.warn(`Webhook: no transaction found for ref ${internalRef}`);
      return { received: true };
    }

    const newStatus =
      status === 'success' ? TransactionStatus.SUCCESS : TransactionStatus.FAILED;

    const updated = await this.transactions.updateStatus(tx.id, newStatus, {
      squadReference,
      metadata: body as any,
    });

    if (newStatus === TransactionStatus.SUCCESS) {
      this.events.emit(PAYMENT_SUCCESS_EVENT, { userId: tx.userId, transaction: updated });
      this.logger.log(`Payment success for user ${tx.userId}, tx ${tx.id}`);
    }

    return { received: true };
  }
}
