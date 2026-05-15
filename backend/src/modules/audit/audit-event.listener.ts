import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { AuditActorType } from '@prisma/client';
import { AuditService } from './audit.service';
import { REPAYMENT_EVENTS } from '../repayment/repayment.service';

@Injectable()
export class AuditEventListener {
  constructor(private readonly audit: AuditService) {}

  @OnEvent('auth.login')
  onLogin(p: { userId: string; ip?: string }) {
    this.audit.log({ actorType: AuditActorType.USER, actorId: p.userId, action: 'auth.login', ipAddress: p.ip });
  }

  @OnEvent('auth.logout')
  onLogout(p: { userId: string }) {
    this.audit.log({ actorType: AuditActorType.USER, actorId: p.userId, action: 'auth.logout' });
  }

  @OnEvent('loan.disbursed')
  onLoanDisbursed(p: { userId: string; disbursement: { id: string; amount: number } }) {
    this.audit.log({ actorType: AuditActorType.SYSTEM, actorId: p.userId, action: 'loan.disbursed', entityType: 'LoanDisbursement', entityId: p.disbursement.id, metadata: { amount: p.disbursement.amount } });
  }

  @OnEvent(REPAYMENT_EVENTS.COMPLETED)
  onRepaymentCompleted(p: { userId: string; loanId: string; amount: number }) {
    this.audit.log({ actorType: AuditActorType.USER, actorId: p.userId, action: 'repayment.completed', entityType: 'LoanDisbursement', entityId: p.loanId, metadata: { amount: p.amount } });
  }

  @OnEvent(REPAYMENT_EVENTS.DEFAULT_DETECTED)
  onDefault(p: { loanId: string }) {
    this.audit.log({ actorType: AuditActorType.SYSTEM, actorId: 'system', action: 'loan.default.detected', entityType: 'LoanDisbursement', entityId: p.loanId });
  }

  @OnEvent('fraud.detected')
  onFraud(p: { userId: string; riskLevel: string }) {
    this.audit.log({ actorType: AuditActorType.SYSTEM, actorId: 'system', action: 'fraud.detected', entityType: 'User', entityId: p.userId, metadata: { riskLevel: p.riskLevel } });
  }

  @OnEvent('payout.success')
  onPayout(p: { userId: string; amount: number; reference: string }) {
    this.audit.log({ actorType: AuditActorType.USER, actorId: p.userId, action: 'payout.executed', metadata: { amount: p.amount, reference: p.reference } });
  }

  @OnEvent('reconciliation.mismatch.detected')
  onMismatch(p: { jobId: string; reference: string; type: string }) {
    this.audit.log({ actorType: AuditActorType.SYSTEM, actorId: 'system', action: 'reconciliation.mismatch.detected', entityType: 'ReconciliationJob', entityId: p.jobId, metadata: { reference: p.reference, type: p.type } });
  }
}
