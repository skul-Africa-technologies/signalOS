import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { IntelligenceEngineService } from '../intelligence-engine.service';

@Injectable()
export class InactiveUserListener {
  private readonly logger = new Logger(InactiveUserListener.name);

  constructor(private readonly engine: IntelligenceEngineService) {}

  // Fired by a scheduled job when a user has had no activity for N days
  @OnEvent('user.inactive', { async: true })
  async handle(payload: { userId: string; inactiveDays: number }): Promise<void> {
    this.logger.warn(
      `user.inactive (${payload.inactiveDays}d) → re-analysing user ${payload.userId}`,
    );
    await this.engine.analyseUser(payload.userId);
  }
}
