import { Module } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { WalletController } from './wallet.controller';
import { WalletPaymentListener } from './wallet-payment.listener';
import { LedgerModule } from '../ledger/ledger.module';

@Module({
  imports: [LedgerModule],
  providers: [WalletService, WalletPaymentListener],
  controllers: [WalletController],
  exports: [WalletService],
})
export class WalletModule {}
