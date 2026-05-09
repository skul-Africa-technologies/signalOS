import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { EconomicProfileRecord, RiskLevel } from '../interfaces/intelligence.interfaces';

type ProfileUpdateData = Omit<EconomicProfileRecord, 'userId' | 'updatedAt'>;

@Injectable()
export class EconomicProfileService {
  private readonly logger = new Logger(EconomicProfileService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getProfile(userId: string): Promise<EconomicProfileRecord> {
    const record = await this.prisma.economicProfile.findUnique({ where: { userId } });
    if (!record) throw new NotFoundException(`Economic profile not found for user ${userId}`);
    return this.toRecord(record);
  }

  async getOrCreate(userId: string): Promise<EconomicProfileRecord> {
    const record = await this.prisma.economicProfile.upsert({
      where: { userId },
      create: { userId },
      update: {},
    });
    return this.toRecord(record);
  }

  /** Atomic upsert — all score fields written in a single DB operation */
  async syncProfile(userId: string, data: ProfileUpdateData): Promise<EconomicProfileRecord> {
    this.logger.debug(`Syncing profile for user ${userId} — trust=${data.trustScore} risk=${data.riskLevel}`);

    const record = await this.prisma.economicProfile.upsert({
      where: { userId },
      create: { userId, ...this.toDbData(data) },
      update: this.toDbData(data),
    });

    return this.toRecord(record);
  }

  private toDbData(data: ProfileUpdateData) {
    return {
      trustScore: data.trustScore,
      reliabilityScore: data.reliabilityScore,
      liquidityScore: data.liquidityScore,
      employabilityScore: data.employabilityScore,
      consistencyScore: data.consistencyScore,
      growthScore: data.growthScore,
      participationScore: data.participationScore,
      activityLevel: data.activityLevel,
      riskLevel: data.riskLevel,
    };
  }

  private toRecord(row: {
    userId: string;
    trustScore: number;
    reliabilityScore: number;
    liquidityScore: number;
    employabilityScore: number;
    consistencyScore: number;
    growthScore: number;
    participationScore: number;
    activityLevel: number;
    riskLevel: string;
    updatedAt: Date;
  }): EconomicProfileRecord {
    return {
      userId: row.userId,
      trustScore: row.trustScore,
      reliabilityScore: row.reliabilityScore,
      liquidityScore: row.liquidityScore,
      employabilityScore: row.employabilityScore,
      consistencyScore: row.consistencyScore,
      growthScore: row.growthScore,
      participationScore: row.participationScore,
      activityLevel: row.activityLevel,
      riskLevel: row.riskLevel as RiskLevel,
      updatedAt: row.updatedAt,
    };
  }
}
