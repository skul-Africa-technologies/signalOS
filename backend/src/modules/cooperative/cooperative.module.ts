import { Module } from '@nestjs/common';
import { GroupLedgerService } from './group-ledger.service';
import { GroupWalletService } from './group-wallet.service';
import { CooperativeTreasuryService } from './cooperative-treasury.service';
import { GroupLoanService } from './group-loan.service';
import { CooperativeController } from './cooperative.controller';
import { CooperativeEventListener } from './cooperative-event.listener';
import { WalletModule } from '../wallet/wallet.module';

@Module({
  imports: [WalletModule],
  providers: [
    GroupLedgerService,
    GroupWalletService,
    CooperativeTreasuryService,
    GroupLoanService,
    CooperativeEventListener,
  ],
  controllers: [CooperativeController],
  exports: [GroupWalletService, GroupLedgerService, CooperativeTreasuryService, GroupLoanService],
})
export class CooperativeModule {}
