import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { WebhookService } from './webhook.service';

@Injectable()
export class WebhookEventListener {
  constructor(private readonly webhooks: WebhookService) {}

  @OnEvent('intelligence.analysed')
  async onIntelligenceAnalysed(payload: { userId: string; trustScore: number; riskLevel: string }) {
    await this.webhooks.emit('trust.score.updated', payload);
  }

  @OnEvent('loan.approved')
  async onLoanApproved(payload: { userId: string; amount: number }) {
    await this.webhooks.emit('loan.eligible', payload);
  }

  @OnEvent('loan.defaulted')
  async onLoanDefaulted(payload: { userId: string; loanId: string }) {
    await this.webhooks.emit('repayment.defaulted', payload);
  }

  @OnEvent('fraud.detected')
  async onFraudDetected(payload: { userId: string; riskLevel: string }) {
    await this.webhooks.emit('fraud.detected', payload);
  }

  @OnEvent('cooperative.risk.changed')
  async onCoopRiskChanged(payload: { groupId: string; riskLevel: string }) {
    await this.webhooks.emit('cooperative.risk.changed', payload);
  }

  @OnEvent('treasury.health.changed')
  async onTreasuryHealthChanged(payload: { groupId: string; health: string }) {
    await this.webhooks.emit('treasury.health.changed', payload);
  }
}
