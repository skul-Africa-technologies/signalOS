import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { BehaviouralProfile } from '../interfaces/intelligence.interfaces';

@Injectable()
export class ProfileStore {
  private readonly logger = new Logger(ProfileStore.name);

  constructor(private readonly prisma: PrismaService) {}

  async save(profile: BehaviouralProfile): Promise<void> {
    this.logger.debug(`Persisting profile for user ${profile.userId}`);

    const data = {
      trustScore: profile.scores.trustScore,
      reliabilityScore: profile.scores.reliabilityScore,
      liquidityScore: profile.scores.liquidityScore,
      employabilityScore: profile.scores.employabilityScore,
      consistencyScore: profile.scores.consistencyScore,
      growthScore: profile.scores.growthScore,
      participationScore: profile.scores.participationScore,
      activityLevel: profile.signals.activityLevel,
      riskLevel: profile.riskLevel,
    };

    await this.prisma.economicProfile.upsert({
      where: { userId: profile.userId },
      create: { userId: profile.userId, ...data },
      update: data,
    });
  }
}
