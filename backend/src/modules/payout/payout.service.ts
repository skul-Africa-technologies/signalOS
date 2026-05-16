import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ConfigService } from '@nestjs/config';
import { LedgerCategory, PayoutStatus, WithdrawalStatus } from '../../common/prisma-enums';
import axios, { AxiosInstance } from 'axios';
import { PrismaService } from '../../prisma/prisma.service';
import { WalletService } from '../wallet/wallet.service';
import { WithdrawDto } from './dto/withdraw.dto';

export const PAYOUT_EVENTS = {
  WITHDRAWAL_REQUESTED: 'withdrawal.requested',
  PAYOUT_SUCCESS: 'payout.success',
  PAYOUT_FAILED: 'payout.failed',
} as const;

@Injectable()
export class PayoutService {
  private readonly logger = new Logger(PayoutService.name);
  private readonly squadClient: AxiosInstance;

  constructor(
    private readonly prisma: PrismaService,
    private readonly walletService: WalletService,
    private readonly events: EventEmitter2,
    private readonly config: ConfigService,
  ) {
    const baseURL =
      config.get('squad.env') === 'production'
        ? 'https://api-d.squadco.com'
        : 'https://sandbox-api-d.squadco.com';

    this.squadClient = axios.create({
      baseURL,
      headers: {
        Authorization: `Bearer ${config.get('squad.secretKey')}`,
        'Content-Type': 'application/json',
      },
    });
  }

  async requestWithdrawal(userId: string, dto: WithdrawDto) {
    const wallet = await this.walletService.getWallet(userId);
    if (wallet.availableBalance < dto.amount) {
      throw new BadRequestException(
        `Insufficient balance. Available: ₦${wallet.availableBalance}, Requested: ₦${dto.amount}`,
      );
    }

    const reference = `wdl_${userId}_${Date.now()}`;

    // Atomic: debit wallet + create withdrawal record
    const [withdrawal] = await this.prisma.$transaction(async (tx) => {
      const w = await tx.wallet.findUnique({ where: { userId } });
      if (!w || w.availableBalance < dto.amount) {
        throw new BadRequestException('Insufficient balance');
      }

      await tx.wallet.update({
        where: { id: w.id },
        data: {
          availableBalance: { decrement: dto.amount },
          totalDebits: { increment: dto.amount },
        },
      });

      await tx.ledgerEntry.create({
        data: {
          walletId: w.id,
          type: 'DEBIT',
          direction: 'DEBIT',
          amount: dto.amount,
          reference: `ledger_${reference}`,
          category: LedgerCategory.WITHDRAWAL,
          balanceBefore: w.availableBalance,
          balanceAfter: w.availableBalance - dto.amount,
          metadata: JSON.stringify({ withdrawalRef: reference }),
        },
      });

      const withdrawal = await tx.withdrawal.create({
        data: {
          walletId: w.id,
          userId,
          amount: dto.amount,
          reference,
          bankCode: dto.bankCode,
          accountNumber: dto.accountNumber,
          accountName: dto.accountName,
          narration: dto.narration ?? 'Withdrawal from signalOS wallet',
          status: WithdrawalStatus.PROCESSING,
        },
      });

      return [withdrawal];
    });

    // Initiate Squad transfer (non-blocking — webhook confirms)
    this.initiateSquadTransfer(userId, withdrawal.id, reference, dto).catch((err) => {
      this.logger.error(`Squad transfer failed for ${reference}: ${err.message}`);
    });

    this.events.emit(PAYOUT_EVENTS.WITHDRAWAL_REQUESTED, { userId, withdrawal });
    return withdrawal;
  }

  private async initiateSquadTransfer(
    userId: string,
    withdrawalId: string,
    reference: string,
    dto: WithdrawDto,
  ) {
    try {
      const payout = await this.prisma.payout.create({
        data: {
          walletId: (await this.walletService.getWallet(userId)).id,
          userId,
          amount: dto.amount,
          reference: `payout_${reference}`,
          bankCode: dto.bankCode,
          accountNumber: dto.accountNumber,
          accountName: dto.accountName,
          narration: dto.narration ?? 'signalOS withdrawal',
          status: PayoutStatus.PROCESSING,
        },
      });

      const response = await this.squadClient.post('/payout/initiate', {
        transaction_reference: payout.reference,
        amount: dto.amount * 100, // Squad expects kobo
        bank_code: dto.bankCode,
        account_number: dto.accountNumber,
        account_name: dto.accountName,
        narration: dto.narration ?? 'signalOS withdrawal',
        currency_id: 'NGN',
      });

      const providerRef = response.data?.data?.transaction_reference;
      await this.prisma.payout.update({
        where: { id: payout.id },
        data: { providerRef, status: PayoutStatus.PROCESSING },
      });

      await this.prisma.withdrawal.update({
        where: { id: withdrawalId },
        data: { payoutId: payout.id, status: WithdrawalStatus.PROCESSING },
      });

      this.logger.log(`Squad transfer initiated: ref=${payout.reference}`);
    } catch (err: any) {
      this.logger.error(`Squad transfer error: ${err.message}`);
      // Mark withdrawal as failed and refund wallet
      await this.handlePayoutFailure(userId, withdrawalId, dto.amount, err.message);
    }
  }

  private async handlePayoutFailure(
    userId: string,
    withdrawalId: string,
    amount: number,
    reason: string,
  ) {
    const wallet = await this.walletService.getWallet(userId);
    const refundRef = `refund_wdl_${withdrawalId}_${Date.now()}`;

    await this.prisma.$transaction(async (tx) => {
      await tx.wallet.update({
        where: { id: wallet.id },
        data: {
          availableBalance: { increment: amount },
          totalDebits: { decrement: amount },
        },
      });

      await tx.ledgerEntry.create({
        data: {
          walletId: wallet.id,
          type: 'CREDIT',
          direction: 'CREDIT',
          amount,
          reference: refundRef,
          category: LedgerCategory.REFUND,
          balanceBefore: wallet.availableBalance,
          balanceAfter: wallet.availableBalance + amount,
          metadata: JSON.stringify({ reason, withdrawalId }),
        },
      });

      await tx.withdrawal.update({
        where: { id: withdrawalId },
        data: { status: WithdrawalStatus.FAILED },
      });
    });

    this.events.emit(PAYOUT_EVENTS.PAYOUT_FAILED, { userId, withdrawalId, reason });
    this.logger.warn(`Payout failed for withdrawal ${withdrawalId} — wallet refunded`);
  }

  async handlePayoutWebhook(payload: Record<string, any>) {
    const event = payload?.Event ?? payload?.event;
    const body = payload?.Body ?? payload?.body ?? payload;
    const ref: string = body?.transaction_reference ?? body?.transactionRef;
    const status: string = body?.status ?? body?.transaction_status;

    if (!ref) return { received: true };

    const payout = await this.prisma.payout.findUnique({ where: { reference: ref } });
    if (!payout) return { received: true };

    if (status === 'success' || status === 'successful') {
      await this.prisma.payout.update({
        where: { id: payout.id },
        data: { status: PayoutStatus.SUCCESS, providerRef: body?.provider_ref ?? payout.providerRef },
      });
      if (payout.userId) {
        await this.prisma.withdrawal.updateMany({
          where: { payoutId: payout.id },
          data: { status: WithdrawalStatus.COMPLETED },
        });
        this.events.emit(PAYOUT_EVENTS.PAYOUT_SUCCESS, { userId: payout.userId, payout });
      }
    } else if (status === 'failed' || status === 'error') {
      await this.prisma.payout.update({
        where: { id: payout.id },
        data: { status: PayoutStatus.FAILED, failureReason: body?.reason ?? 'Transfer failed' },
      });
      const withdrawal = await this.prisma.withdrawal.findFirst({ where: { payoutId: payout.id } });
      if (withdrawal) {
        await this.handlePayoutFailure(payout.userId, withdrawal.id, payout.amount, body?.reason ?? 'Transfer failed');
      }
    }

    return { received: true };
  }

  async getWithdrawals(userId: string) {
    return this.prisma.withdrawal.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getPayouts(userId: string) {
    return this.prisma.payout.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
