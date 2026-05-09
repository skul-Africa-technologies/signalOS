import { Module } from '@nestjs/common';
import { LoansService } from './loans.service';
import { LoansController } from './loans.controller';
import { TrustScoreModule } from '../trust-score/trust-score.module';
import { WalletModule } from '../wallet/wallet.module';

@Module({
  imports: [TrustScoreModule, WalletModule],
  providers: [LoansService],
  controllers: [LoansController],
  exports: [LoansService],
})
export class LoansModule {}
