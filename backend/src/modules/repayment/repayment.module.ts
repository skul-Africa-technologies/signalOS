import { Module } from '@nestjs/common';
import { RepaymentService } from './repayment.service';
import { RepaymentController } from './repayment.controller';
import { RepaymentEventListener } from './repayment-event.listener';
import { WalletModule } from '../wallet/wallet.module';
import { TrustScoreModule } from '../trust-score/trust-score.module';

@Module({
  imports: [WalletModule, TrustScoreModule],
  providers: [RepaymentService, RepaymentEventListener],
  controllers: [RepaymentController],
  exports: [RepaymentService],
})
export class RepaymentModule {}
