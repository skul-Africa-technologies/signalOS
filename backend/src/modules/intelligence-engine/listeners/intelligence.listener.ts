import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { IntelligenceEngineService } from '../intelligence-engine.service';
import { INTELLIGENCE_EVENTS } from '../intelligence.constants';
import { IntelligenceEventPayload } from '../dto/intelligence.dto';

@Injectable()
export class IntelligenceEventListener {
  private readonly logger = new Logger(IntelligenceEventListener.name);

  constructor(private readonly intelligenceEngine: IntelligenceEngineService) {}

  @OnEvent(INTELLIGENCE_EVENTS.ANALYSE_USER)
  async handleAnalyseUser(payload: IntelligenceEventPayload): Promise<void> {
    this.logger.log(`Intelligence analysis triggered for user ${payload.userId} via ${payload.triggeredBy}`);
    await this.intelligenceEngine.analyseUser(payload.userId);
  }
}
