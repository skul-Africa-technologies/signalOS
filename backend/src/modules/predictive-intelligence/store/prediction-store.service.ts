import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { PredictionType, PredictionConfidenceLevel } from '../interfaces/prediction.interfaces';
import { PREDICTION_TTL_HOURS } from '../prediction.constants';

@Injectable()
export class PredictionStoreService {
  constructor(private readonly prisma: PrismaService) {}

  async save(params: {
    userId: string;
    predictionType: PredictionType;
    predictedValue: number;
    confidence: number;
    predictionWindow: number;
    metadata: Record<string, unknown>;
  }) {
    const ttlHours = PREDICTION_TTL_HOURS[params.predictionType] ?? 24;
    const expiresAt = new Date(Date.now() + ttlHours * 3600 * 1000);

    return this.prisma.predictionSnapshot.create({
      data: {
        userId: params.userId,
        predictionType: params.predictionType,
        predictedValue: params.predictedValue,
        confidence: params.confidence,
        predictionWindow: params.predictionWindow,
        metadata: JSON.stringify(params.metadata),
        expiresAt,
      },
    });
  }

  async getLatest(userId: string, predictionType: PredictionType) {
    const row = await this.prisma.predictionSnapshot.findFirst({
      where: { userId, predictionType, expiresAt: { gt: new Date() } },
      orderBy: { generatedAt: 'desc' },
    });
    if (!row) return null;
    return { ...row, metadata: JSON.parse(row.metadata as string) };
  }

  async getHistory(userId: string, predictionType: PredictionType, limit = 30) {
    const rows = await this.prisma.predictionSnapshot.findMany({
      where: { userId, predictionType },
      orderBy: { generatedAt: 'desc' },
      take: limit,
    });
    return rows.map((r) => ({ ...r, metadata: JSON.parse(r.metadata as string) }));
  }

  async invalidate(userId: string, predictionType: PredictionType) {
    await this.prisma.predictionSnapshot.updateMany({
      where: { userId, predictionType, expiresAt: { gt: new Date() } },
      data: { expiresAt: new Date() },
    });
  }
}
