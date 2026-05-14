import { CanActivate, ExecutionContext, HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { RateLimitService } from '../rate-limit.service';

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(private readonly rateLimitSvc: RateLimitService) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest();
    const org = req.organization;
    if (!org) return true; // guard runs after ApiKeyGuard; org always present on external routes

    const endpoint = req.path as string;
    const { allowed, remaining, limit } = await this.rateLimitSvc.checkAndIncrement(org.id, org.rateLimitTier, endpoint);

    const res = ctx.switchToHttp().getResponse();
    res.setHeader('X-RateLimit-Limit', limit);
    res.setHeader('X-RateLimit-Remaining', remaining);

    if (!allowed) {
      throw new HttpException(
        { statusCode: 429, message: 'Rate limit exceeded. Upgrade your tier or try again tomorrow.' },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }
}
