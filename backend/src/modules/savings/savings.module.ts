import { Module } from '@nestjs/common';
import { SavingsService } from './savings.service';
import { SavingsController } from './savings.controller';
import { WalletModule } from '../wallet/wallet.module';
import { CooperativeModule } from '../cooperative/cooperative.module';

@Module({
  imports: [WalletModule, CooperativeModule],
  providers: [SavingsService],
  controllers: [SavingsController],
  exports: [SavingsService],
})
export class SavingsModule {}
