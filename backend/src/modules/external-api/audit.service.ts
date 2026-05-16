import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface AuditLogEntry {
  organizationId: string;
  endpoint: string;
  userId?: string;
  scopesUsed: string[];
  purpose?: string;
  ipAddress?: string;
  responseStatus: number;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Fire-and-forget immutable audit write */
  log(entry: AuditLogEntry): void {
    this.prisma.externalAccessAuditLog
      .create({ data: { ...entry, scopesUsed: Array.isArray(entry.scopesUsed) ? entry.scopesUsed.join(",") : entry.scopesUsed } })
      .catch((err) => this.logger.error('Audit log write failed', err));
  }

  async query(organizationId: string, limit = 100) {
    return this.prisma.externalAccessAuditLog.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}
