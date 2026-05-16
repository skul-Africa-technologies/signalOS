import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { AuditActorType } from './audit.service';
import { AdminGuard } from '../admin/guards/admin.guard';
import { RequirePermissions } from '../admin/decorators/permissions.decorator';
import { AuditService } from './audit.service';

@ApiTags('Audit Logs')
@ApiSecurity('x-admin-token')
@UseGuards(AdminGuard)
@RequirePermissions('audits.read')
@Controller('admin/audit')
export class AuditController {
  constructor(private readonly svc: AuditService) {}

  @Get()
  @ApiOperation({ summary: 'Query audit logs with filters' })
  query(
    @Query('actorType') actorType?: AuditActorType,
    @Query('actorId') actorId?: string,
    @Query('action') action?: string,
    @Query('entityType') entityType?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') page = '1',
    @Query('limit') limit = '50',
  ) {
    return this.svc.query({
      actorType, actorId, action, entityType,
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
      page: +page, limit: +limit,
    });
  }

  @Get('entity/:type/:id')
  @ApiOperation({ summary: 'Get full audit history for an entity' })
  entityHistory(@Param('type') type: string, @Param('id') id: string) {
    return this.svc.getEntityHistory(type, id);
  }

  @Get('actor/:id')
  @ApiOperation({ summary: 'Get full audit history for an actor' })
  actorHistory(@Param('id') id: string) {
    return this.svc.getActorHistory(id);
  }
}
