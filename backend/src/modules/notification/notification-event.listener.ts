import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { NotificationChannel, NotificationType } from '@prisma/client';
import { NotificationService } from './notification.service';
import { PrismaService } from '../../prisma/prisma.service';
import { REPAYMENT_EVENTS } from '../repayment/repayment.service';

const ALL_CHANNELS = [NotificationChannel.IN_APP, NotificationChannel.EMAIL, NotificationChannel.SMS];

@Injectable()
export class NotificationEventListener {
  constructor(
    private readonly notifications: NotificationService,
    private readonly prisma: PrismaService,
  ) {}

  @OnEvent(REPAYMENT_EVENTS.COMPLETED)
  async onRepaymentCompleted(payload: { userId: string; amount: number }) {
    await this.notifications.send({
      userId: payload.userId,
      type: NotificationType.PAYMENT_SUCCESS,
      title: 'Repayment Successful',
      message: `Your loan repayment of ₦${payload.amount.toLocaleString()} has been processed successfully.`,
      channels: ALL_CHANNELS,
    });
  }

  @OnEvent(REPAYMENT_EVENTS.OVERDUE)
  async onRepaymentOverdue(payload: { loanId: string; daysOverdue: number; penalty: number }) {
    const loan = await this.prisma.loanDisbursement.findUnique({ where: { id: payload.loanId } });
    if (!loan) return;
    await this.notifications.send({
      userId: loan.userId,
      type: NotificationType.REPAYMENT_OVERDUE,
      title: 'Repayment Overdue',
      message: `Your loan repayment is ${payload.daysOverdue} days overdue. A penalty of ₦${payload.penalty.toLocaleString()} has been applied. Please repay immediately.`,
      channels: ALL_CHANNELS,
      metadata: { loanId: payload.loanId, daysOverdue: payload.daysOverdue },
    });
  }

  @OnEvent(REPAYMENT_EVENTS.DEFAULT_DETECTED)
  async onDefault(payload: { loanId: string }) {
    const loan = await this.prisma.loanDisbursement.findUnique({ where: { id: payload.loanId } });
    if (!loan) return;
    await this.notifications.send({
      userId: loan.userId,
      type: NotificationType.FRAUD_ALERT,
      title: 'Loan Default Notice',
      message: 'Your loan has been marked as defaulted. Please contact support immediately.',
      channels: ALL_CHANNELS,
    });
  }

  @OnEvent('loan.approved')
  async onLoanApproved(payload: { userId: string; eligibleAmount: number }) {
    await this.notifications.send({
      userId: payload.userId,
      type: NotificationType.LOAN_APPROVED,
      title: 'Loan Approved',
      message: `Congratulations! You are eligible for a loan of up to ₦${payload.eligibleAmount.toLocaleString()}.`,
      channels: [NotificationChannel.IN_APP, NotificationChannel.SMS],
    });
  }

  @OnEvent('payout.success')
  async onPayoutSuccess(payload: { userId: string; amount: number }) {
    await this.notifications.send({
      userId: payload.userId,
      type: NotificationType.WITHDRAWAL_SUCCESS,
      title: 'Withdrawal Successful',
      message: `Your withdrawal of ₦${payload.amount.toLocaleString()} has been processed.`,
      channels: [NotificationChannel.IN_APP, NotificationChannel.SMS],
    });
  }

  @OnEvent('intelligence.profile.updated')
  async onTrustScoreChanged(payload: { userId: string; trustScore: number }) {
    await this.notifications.send({
      userId: payload.userId,
      type: NotificationType.TRUST_SCORE_CHANGED,
      title: 'Trust Score Updated',
      message: `Your financial trust score has been updated to ${payload.trustScore}.`,
      channels: [NotificationChannel.IN_APP],
    });
  }
}
