import { Module } from '@nestjs/common';
import { AuditService } from './audit.service';
import { AuditController } from './audit.controller';
import { AuditEventListener } from './audit-event.listener';
import { AdminModule } from '../admin/admin.module';

@Module({
  imports: [AdminModule],
  providers: [AuditService, AuditEventListener],
  controllers: [AuditController],
  exports: [AuditService],
})
export class AuditModule {}
