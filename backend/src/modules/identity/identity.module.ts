import { Module } from '@nestjs/common';
import { IdentityService } from './identity.service';
import { IdentityController } from './identity.controller';
import { SignalExtractorService } from './signal-extractor.service';

@Module({
  providers: [IdentityService, SignalExtractorService],
  controllers: [IdentityController],
  exports: [IdentityService, SignalExtractorService],
})
export class IdentityModule {}
