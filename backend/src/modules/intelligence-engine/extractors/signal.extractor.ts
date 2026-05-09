import { Injectable, Logger } from '@nestjs/common';
import { Transaction, Contribution, GroupMember } from '@prisma/client';
import { EconomicSignals } from '../interfaces/intelligence.interfaces';
import { PaymentSignalExtractor } from './payment-signal.extractor';
import { SavingsSignalExtractor } from './savings-signal.extractor';
import { TransactionSignalExtractor } from './transaction-signal.extractor';
import { ParticipationSignalExtractor } from './participation-signal.extractor';

@Injectable()
export class SignalExtractor {
  private readonly logger = new Logger(SignalExtractor.name);

  constructor(
    private readonly paymentExtractor: PaymentSignalExtractor,
    private readonly savingsExtractor: SavingsSignalExtractor,
    private readonly transactionExtractor: TransactionSignalExtractor,
    private readonly participationExtractor: ParticipationSignalExtractor,
  ) {}

  extract(
    transactions: Transaction[],
    contributions: Contribution[],
    memberships: GroupMember[],
  ): EconomicSignals {
    this.logger.debug(
      `Extracting signals: ${transactions.length} txns, ${contributions.length} contributions, ${memberships.length} memberships`,
    );

    const payment = this.paymentExtractor.extract(transactions);
    const savings = this.savingsExtractor.extract(contributions);
    const transaction = this.transactionExtractor.extract(transactions);
    const participation = this.participationExtractor.extract(memberships, contributions);

    return {
      transactionFrequency: payment.transactionFrequency,
      repaymentConsistency: payment.repaymentConsistency,
      repeatCustomerRate: payment.repeatCustomerRate,
      incomeStability: transaction.incomeStability,
      cashflowVolatility: transaction.cashflowVolatility,
      activityLevel: transaction.activityLevel,
      savingsBehaviour: savings.savingsBehaviour,
      contributionReliability: savings.contributionReliability,
      groupParticipation: participation.groupParticipation,
    };
  }
}
