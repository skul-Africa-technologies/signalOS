import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class IdentityService {
  constructor(private readonly prisma: PrismaService) {}

  async getOrCreateProfile(userId: string) {
    const existing = await this.prisma.economicProfile.findUnique({
      where: { userId },
    });
    if (existing) return existing;

    return this.prisma.economicProfile.create({ data: { userId } });
  }

  getProfile(userId: string) {
    return this.prisma.economicProfile.findUnique({ where: { userId } });
  }

  updateScores(
    userId: string,
    scores: {
      trustScore: number;
      reliabilityScore: number;
      liquidityScore: number;
      employabilityScore: number;
    },
  ) {
    return this.prisma.economicProfile.upsert({
      where: { userId },
      create: { userId, ...scores },
      update: scores,
    });
  }
}
