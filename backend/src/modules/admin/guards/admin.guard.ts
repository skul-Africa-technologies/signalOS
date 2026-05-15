import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../../prisma/prisma.service';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { AdminRole } from '@prisma/client';

const ROLE_PERMISSIONS: Record<AdminRole, string[]> = {
  SUPER_ADMIN: ['*'],
  OPERATIONS_ADMIN: ['users.read', 'users.freeze', 'wallets.read', 'loans.approve', 'treasury.manage'],
  TREASURY_ADMIN: ['treasury.manage', 'wallets.read', 'reconciliation.execute'],
  FRAUD_ANALYST: ['fraud.review', 'users.freeze', 'users.read', 'audits.read'],
  SUPPORT_ADMIN: ['users.read', 'wallets.read'],
  AUDITOR: ['audits.read', 'users.read', 'wallets.read'],
};

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest();
    const token = req.headers['x-admin-token'] as string;
    if (!token) throw new UnauthorizedException('Missing x-admin-token header');

    let payload: { adminId: string };
    try {
      payload = this.jwt.verify(token, { secret: process.env.JWT_SECRET });
    } catch {
      throw new UnauthorizedException('Invalid admin token');
    }

    const admin = await this.prisma.adminUser.findUnique({ where: { id: payload.adminId } });
    if (!admin || !admin.active) throw new UnauthorizedException('Admin account inactive or not found');

    const required: string[] = this.reflector.getAllAndOverride(PERMISSIONS_KEY, [ctx.getHandler(), ctx.getClass()]) ?? [];
    if (required.length > 0) {
      const effective = admin.role === AdminRole.SUPER_ADMIN
        ? ['*']
        : [...ROLE_PERMISSIONS[admin.role], ...admin.permissions];
      const hasAll = required.every((p) => effective.includes('*') || effective.includes(p));
      if (!hasAll) throw new ForbiddenException(`Insufficient permissions: ${required.join(', ')}`);
    }

    req.admin = admin;
    return true;
  }
}
