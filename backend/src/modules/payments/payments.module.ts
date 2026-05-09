import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { SquadService } from './squad.service';
import { TransactionsModule } from '../transactions/transactions.module';

@Module({
  imports: [TransactionsModule],
  providers: [PaymentsService, SquadService],
  controllers: [PaymentsController],
})
export class PaymentsModule {}
