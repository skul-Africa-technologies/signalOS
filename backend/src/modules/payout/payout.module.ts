import { Module } from '@nestjs/common';
import { PayoutService } from './payout.service';
import { PayoutController } from './payout.controller';
import { WalletModule } from '../wallet/wallet.module';

@Module({
  imports: [WalletModule],
  providers: [PayoutService],
  controllers: [PayoutController],
  exports: [PayoutService],
})
export class PayoutModule {}
