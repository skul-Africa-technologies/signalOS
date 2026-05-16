import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RateLimitTier } from '../../common/prisma-enums';

export const TIER_LIMITS: Record<string, number> = {
  FREE: 100,
  STARTER: 1_000,
  GROWTH: 10_000,
  PROFESSIONAL: 100_000,
  BANK: 50_000,
  ENTERPRISE: 500_000,
};

@Injectable()
export class RateLimitService {
  private readonly logger = new Logger(RateLimitService.name);

  constructor(private readonly prisma: PrismaService) {}

  async checkAndIncrement(
    organizationId: string,
    tier: RateLimitTier,
    endpoint?: string,
  ): Promise<{ allowed: boolean; remaining: number; limit: number }> {
    const limit = TIER_LIMITS[tier];
    const today = this.todayUtc();

    const existing = await this.prisma.organizationUsageMetrics.findFirst({
      where: { organizationId, date: today, endpoint: endpoint ?? null },
    });

    const current = existing?.requestCount ?? 0;

    if (current >= limit) {
      this.logger.warn(`Rate limit exceeded: org=${organizationId} tier=${tier} ${current}/${limit}`);
      return { allowed: false, remaining: 0, limit };
    }

    if (existing) {
      await this.prisma.organizationUsageMetrics.update({
        where: { id: existing.id },
        data: { requestCount: { increment: 1 } },
      });
    } else {
      await this.prisma.organizationUsageMetrics.create({
        data: { organizationId, date: today, endpoint: endpoint ?? null, requestCount: 1 },
      });
    }

    return { allowed: true, remaining: limit - current - 1, limit };
  }

  async getUsage(organizationId: string) {
    const today = this.todayUtc();
    const rows = await this.prisma.organizationUsageMetrics.findMany({
      where: { organizationId, date: today },
    });
    return { date: today, total: rows.reduce((s, r) => s + r.requestCount, 0), breakdown: rows };
  }

  private todayUtc(): Date {
    const d = new Date();
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  }
}
