import { Module } from '@nestjs/common';
import { KycService } from './kyc.service';
import { KycController, KycV2Controller } from './kyc.controller';
import { KycEventListener } from './kyc-event.listener';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  providers: [KycService, KycEventListener],
  controllers: [KycController, KycV2Controller],
  exports: [KycService],
})
export class KycModule {}
