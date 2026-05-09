import { Module } from '@nestjs/common';
import { TrustScoreService } from './trust-score.service';
import { TrustScoreController } from './trust-score.controller';
import { ScoringEngine } from './scoring.engine';
import { TrustScoreListener } from './trust-score.listener';

@Module({
  providers: [TrustScoreService, ScoringEngine, TrustScoreListener],
  controllers: [TrustScoreController],
  exports: [TrustScoreService],
})
export class TrustScoreModule {}
