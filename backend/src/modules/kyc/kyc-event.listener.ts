import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { AuditService } from '../audit/audit.service';
import { KYC_EVENTS } from './kyc.service';

@Injectable()
export class KycEventListener {
  private readonly logger = new Logger(KycEventListener.name);

  constructor(private readonly audit: AuditService) {}

  @OnEvent(KYC_EVENTS.SUBMITTED)
  onSubmitted(p: { userId: string; type: string; profileId?: string }) {
    this.logger.log(`KYC submitted: ${p.type} for user ${p.userId}`);
    this.audit.log({
      actorType: 'USER',
      actorId: p.userId,
      action: KYC_EVENTS.SUBMITTED,
      entityType: 'KycProfile',
      entityId: p.profileId,
      metadata: { type: p.type },
    });
  }

  @OnEvent(KYC_EVENTS.VERIFIED)
  onVerified(p: { userId: string; profileId: string; verificationLevel: string }) {
    this.logger.log(`KYC verified for user ${p.userId} — level: ${p.verificationLevel}`);
    this.audit.log({
      actorType: 'SYSTEM',
      actorId: p.userId,
      action: KYC_EVENTS.VERIFIED,
      entityType: 'KycProfile',
      entityId: p.profileId,
      metadata: { verificationLevel: p.verificationLevel },
    });
  }

  @OnEvent(KYC_EVENTS.REJECTED)
  onRejected(p: { userId: string; profileId: string; reason: string }) {
    this.logger.warn(`KYC rejected for user ${p.userId}: ${p.reason}`);
    this.audit.log({
      actorType: 'SYSTEM',
      actorId: p.userId,
      action: KYC_EVENTS.REJECTED,
      entityType: 'KycProfile',
      entityId: p.profileId,
      metadata: { reason: p.reason },
    });
  }

  @OnEvent(KYC_EVENTS.RISK_DETECTED)
  onRiskDetected(p: { userId: string; riskLevel: string; riskScore: number }) {
    this.logger.warn(`Identity risk detected for user ${p.userId}: ${p.riskLevel} (score: ${p.riskScore})`);
    this.audit.log({
      actorType: 'SYSTEM',
      actorId: 'system',
      action: KYC_EVENTS.RISK_DETECTED,
      entityType: 'User',
      entityId: p.userId,
      metadata: { riskLevel: p.riskLevel, riskScore: p.riskScore },
    });
  }
}
