import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { IntelligenceEngineService } from '../intelligence-engine.service';

@Injectable()
export class SavingsContributionListener {
  private readonly logger = new Logger(SavingsContributionListener.name);

  constructor(private readonly engine: IntelligenceEngineService) {}

  @OnEvent('savings.contribution.created', { async: true })
  async handle(payload: { userId: string }): Promise<void> {
    this.logger.log(`savings.contribution.created → re-analysing user ${payload.userId}`);
    await this.engine.analyseUser(payload.userId);
  }
}
