import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { GrantConsentDto, VALID_SCOPES } from './dto/consent.dto';

@Injectable()
export class ConsentService {
  constructor(private readonly prisma: PrismaService) {}

  async grant(dto: GrantConsentDto) {
    const invalidScopes = dto.scopes.filter((s) => !VALID_SCOPES.includes(s));
    if (invalidScopes.length) throw new BadRequestException(`Invalid scopes: ${invalidScopes.join(', ')}`);

    const org = await this.prisma.organization.findUnique({ where: { id: dto.organizationId } });
    if (!org || !org.active) throw new NotFoundException('Organization not found or inactive');

    const unauthorizedScopes = dto.scopes.filter((s) => !org.allowedScopes.includes(s));
    if (unauthorizedScopes.length) throw new ForbiddenException(`Organization not authorized for scopes: ${unauthorizedScopes.join(', ')}`);

    const expiresAt = dto.expiresAt ? new Date(dto.expiresAt) : new Date(Date.now() + 90 * 24 * 60 * 60 * 1000); // 90 days default

    return this.prisma.consentGrant.create({
      data: {
        userId: dto.userId,
        organizationId: dto.organizationId,
        scopes: Array.isArray(dto.scopes) ? dto.scopes.join(",") : dto.scopes,
        purpose: dto.purpose,
        expiresAt,
      },
    });
  }

  async revoke(consentId: string, userId: string) {
    const consent = await this.prisma.consentGrant.findUnique({ where: { id: consentId } });
    if (!consent) throw new NotFoundException('Consent grant not found');
    if (consent.userId !== userId) throw new ForbiddenException('Cannot revoke another user\'s consent');

    return this.prisma.consentGrant.update({
      where: { id: consentId },
      data: { revoked: true, revokedAt: new Date() },
    });
  }

  async listForUser(userId: string) {
    return this.prisma.consentGrant.findMany({
      where: { userId },
      include: { organization: { select: { name: true, type: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Verify active consent for a user+org+scope combination */
  async verifyConsent(userId: string, organizationId: string, requiredScopes: string[]): Promise<void> {
    const grant = await this.prisma.consentGrant.findFirst({
      where: {
        userId,
        organizationId,
        revoked: false,
        expiresAt: { gt: new Date() },
      },
    });

    if (!grant) throw new ForbiddenException('No active consent grant found for this user');

    const missing = requiredScopes.filter((s) => !grant.scopes.includes(s));
    if (missing.length) throw new ForbiddenException(`Consent does not cover required scopes: ${missing.join(', ')}`);
  }
}
