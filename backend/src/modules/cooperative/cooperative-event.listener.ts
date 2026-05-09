import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { CooperativeTreasuryService } from './cooperative-treasury.service';

@Injectable()
export class CooperativeEventListener {
  private readonly logger = new Logger(CooperativeEventListener.name);

  constructor(private readonly treasury: CooperativeTreasuryService) {}

  @OnEvent('member.contribution', { async: true })
  async onContribution(payload: { groupId: string }) {
    await this.treasury.updateGroupProfile(payload.groupId).catch((e: any) =>
      this.logger.error(`Treasury update failed: ${e.message}`),
    );
  }

  @OnEvent('group.loan.disbursed', { async: true })
  async onLoanDisbursed(payload: { groupId: string }) {
    await this.treasury.updateGroupProfile(payload.groupId).catch((e: any) =>
      this.logger.error(`Treasury update failed: ${e.message}`),
    );
  }

  @OnEvent('group.loan.repaid', { async: true })
  async onLoanRepaid(payload: { groupId: string }) {
    await this.treasury.updateGroupProfile(payload.groupId).catch((e: any) =>
      this.logger.error(`Treasury update failed: ${e.message}`),
    );
  }
}
