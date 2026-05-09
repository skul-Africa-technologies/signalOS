import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { SignalExtractionResult } from '../dto/signal-extraction.dto';

@Injectable()
export class SignalPersistenceService {
  private readonly logger = new Logger(SignalPersistenceService.name);

  constructor(private readonly prisma: PrismaService) {}

  async save(result: SignalExtractionResult): Promise<void> {
    this.logger.debug(`Persisting ${result.dataPoints} signal data points for user ${result.userId}`);

    const { signals } = result;

    // Signals are stored on EconomicProfile as computed scores.
    // The profile row is the canonical signal store until a dedicated signals table is added.
    await this.prisma.economicProfile.upsert({
      where: { userId: result.userId },
      create: {
        userId: result.userId,
        // Map the most trust-relevant signals to profile score columns
        reliabilityScore: signals.repaymentConsistency,
        liquidityScore: signals.cashflowVolatility,
        employabilityScore: signals.activityLevel,
        trustScore: 0, // computed later by ScoreCalculator
      },
      update: {
        reliabilityScore: signals.repaymentConsistency,
        liquidityScore: signals.cashflowVolatility,
        employabilityScore: signals.activityLevel,
      },
    });
  }
}
