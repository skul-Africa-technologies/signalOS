import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export type AuditActorType = 'USER' | 'SYSTEM' | 'ADMIN' | 'EXTERNAL';

export interface AuditEntry {
  actorType: AuditActorType;
  actorId: string;
  action: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

export interface AuditQueryFilter {
  actorType?: AuditActorType;
  actorId?: string;
  action?: string;
  entityType?: string;
  entityId?: string;
  from?: Date;
  to?: Date;
  page?: number;
  limit?: number;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Append-only — never update or delete audit logs */
  log(entry: AuditEntry): void {
    const data: any = {
      actorType: entry.actorType,
      actorId: entry.actorId,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId,
      metadata: entry.metadata ? JSON.stringify(entry.metadata) : undefined,
      ipAddress: entry.ipAddress,
      userAgent: entry.userAgent,
    };
    this.prisma.auditLog.create({ data })
      .catch((err) => this.logger.error('Audit log write failed', err));
  }

  async query(filter: AuditQueryFilter = {}) {
    const { page = 1, limit = 50, from, to, ...where } = filter;
    const prismaWhere: any = { ...where };
    if (from || to) prismaWhere.createdAt = { ...(from && { gte: from }), ...(to && { lte: to }) };

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where: prismaWhere,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.auditLog.count({ where: prismaWhere }),
    ]);

    return { logs, total, page, limit };
  }

  async getEntityHistory(entityType: string, entityId: string) {
    return this.prisma.auditLog.findMany({
      where: { entityType, entityId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getActorHistory(actorId: string) {
    return this.prisma.auditLog.findMany({
      where: { actorId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }
}
