import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../../prisma/prisma.service';
import { SCOPES_KEY } from '../decorators/require-scopes.decorator';
import * as bcrypt from 'bcrypt';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest();
    const rawKey: string | undefined = req.headers['x-api-key'];

    if (!rawKey) throw new UnauthorizedException('Missing x-api-key header');

    // Find all active keys and compare hashes (bcrypt compare)
    const activeKeys = await this.prisma.apiKey.findMany({
      where: { active: true },
      include: { organization: true },
    });

    let matched: (typeof activeKeys)[number] | undefined;
    for (const key of activeKeys) {
      if (await bcrypt.compare(rawKey, key.keyHash)) {
        matched = key;
        break;
      }
    }

    if (!matched) throw new UnauthorizedException('Invalid API key');
    if (!matched.organization.active) throw new ForbiddenException('Organization is inactive');

    // Check expiry
    if (matched.expiresAt && matched.expiresAt < new Date()) {
      throw new UnauthorizedException('API key has expired');
    }

    // Scope enforcement
    const requiredScopes: string[] = this.reflector.getAllAndOverride(SCOPES_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]) ?? [];

    if (requiredScopes.length > 0) {
      const hasAll = requiredScopes.every((s) => matched!.scopes.includes(s));
      if (!hasAll) throw new ForbiddenException(`Insufficient scopes. Required: ${requiredScopes.join(', ')}`);
    }

    // Inject org context and scopes into request
    req.organization = matched.organization;
    req.apiKeyScopes = matched.scopes;

    // Update lastUsedAt async (fire-and-forget)
    this.prisma.apiKey.update({ where: { id: matched.id }, data: { lastUsedAt: new Date() } }).catch(() => {});

    return true;
  }
}
