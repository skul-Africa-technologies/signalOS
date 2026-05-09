import { Module } from '@nestjs/common';
import { ScoringListener } from './scoring.listener';
import { IdentityModule } from '../identity/identity.module';

@Module({
  imports: [IdentityModule],
  providers: [ScoringListener],
})
export class ScoringModule {}
