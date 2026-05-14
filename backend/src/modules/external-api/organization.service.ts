import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateOrganizationDto, IssueApiKeyDto } from './dto/organization.dto';
import { OrgType, RateLimitTier } from '@prisma/client';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';

export const DEFAULT_SCOPES = ['trust:read', 'identity:read', 'loan:read', 'cooperative:read', 'fraud:read', 'activity:read'];

@Injectable()
export class OrganizationService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateOrganizationDto) {
    const existing = await this.prisma.organization.findUnique({ where: { contactEmail: dto.contactEmail } });
    if (existing) throw new ConflictException('Organization with this email already exists');

    return this.prisma.organization.create({
      data: {
        name: dto.name,
        type: dto.type,
        contactEmail: dto.contactEmail,
        webhookUrl: dto.webhookUrl,
        rateLimitTier: dto.rateLimitTier ?? RateLimitTier.FREE,
        allowedScopes: dto.allowedScopes ?? DEFAULT_SCOPES,
      },
    });
  }

  async issueApiKey(organizationId: string, dto: IssueApiKeyDto): Promise<{ plainKey: string; keyId: string }> {
    const org = await this.findOrThrow(organizationId);
    const plainKey = `sk_${crypto.randomBytes(32).toString('hex')}`;
    const keyHash = await bcrypt.hash(plainKey, 12);
    const scopes = dto.scopes ?? org.allowedScopes;

    const key = await this.prisma.apiKey.create({
      data: { organizationId, keyHash, label: dto.label, scopes },
    });

    return { plainKey, keyId: key.id };
  }

  async revokeApiKey(keyId: string) {
    return this.prisma.apiKey.update({ where: { id: keyId }, data: { active: false } });
  }

  async setActive(organizationId: string, active: boolean) {
    return this.prisma.organization.update({ where: { id: organizationId }, data: { active } });
  }

  async findById(id: string) {
    return this.findOrThrow(id);
  }

  async findAll() {
    return this.prisma.organization.findMany({ orderBy: { createdAt: 'desc' } });
  }

  private async findOrThrow(id: string) {
    const org = await this.prisma.organization.findUnique({ where: { id } });
    if (!org) throw new NotFoundException('Organization not found');
    return org;
  }
}
