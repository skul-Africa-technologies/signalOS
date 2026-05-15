import { Module } from '@nestjs/common';
import { ReconciliationService } from './reconciliation.service';
import { ReconciliationController } from './reconciliation.controller';
import { ReconciliationEventListener } from './reconciliation-event.listener';
import { AdminModule } from '../admin/admin.module';

@Module({
  imports: [AdminModule],
  providers: [ReconciliationService, ReconciliationEventListener],
  controllers: [ReconciliationController],
  exports: [ReconciliationService],
})
export class ReconciliationModule {}
