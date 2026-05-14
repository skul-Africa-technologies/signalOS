import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Organization } from '@prisma/client';

export const OrgContext = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): Organization => {
    return ctx.switchToHttp().getRequest().organization;
  },
);
