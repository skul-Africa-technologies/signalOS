import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { GroupLedgerCategory, GroupLoanStatus, LedgerCategory } from '../../common/prisma-enums';
import { PrismaService } from '../../prisma/prisma.service';
import { GroupWalletService } from './group-wallet.service';
import { WalletService } from '../wallet/wallet.service';

export const GROUP_LOAN_EVENTS = {
  DISBURSED: 'group.loan.disbursed',
  REPAID: 'group.loan.repaid',
} as const;

@Injectable()
export class GroupLoanService {
  private readonly logger = new Logger(GroupLoanService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly groupWallet: GroupWalletService,
    private readonly walletService: WalletService,
    private readonly events: EventEmitter2,
  ) {}

  async disburse(groupId: string, borrowerId: string, amount: number) {
    // Verify membership
    const member = await this.prisma.groupMember.findUnique({
      where: { userId_groupId: { userId: borrowerId, groupId } },
    });
    if (!member) throw new BadRequestException('Borrower must be a group member');

    // Check no active loan
    const active = await this.prisma.groupLoan.findFirst({
      where: { groupId, borrowerId, status: GroupLoanStatus.DISBURSED },
    });
    if (active) throw new BadRequestException('Member already has an active group loan');

    const wallet = await this.groupWallet.getWallet(groupId);
    if (wallet.lendingPoolBalance < amount) {
      throw new BadRequestException(`Insufficient lending pool. Available: ₦${wallet.lendingPoolBalance}`);
    }

    const reference = `gloan_${groupId}_${borrowerId}_${Date.now()}`;
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);

    // Atomic: debit group treasury + credit member wallet + create loan record
    const loan = await this.prisma.$transaction(async (tx) => {
      const gw = await tx.savingsGroupWallet.findUnique({ where: { groupId } });
      if (!gw || gw.lendingPoolBalance < amount) throw new BadRequestException('Insufficient lending pool');

      await tx.savingsGroupWallet.update({
        where: { id: gw.id },
        data: {
          availableBalance: { decrement: amount },
          lendingPoolBalance: { decrement: amount },
          totalLoansIssued: { increment: amount },
        },
      });

      await tx.groupLedgerEntry.create({
        data: {
          groupWalletId: gw.id,
          type: 'DEBIT',
          direction: 'DEBIT',
          amount,
          reference: `ledger_${reference}`,
          category: GroupLedgerCategory.GROUP_LOAN_DISBURSEMENT,
          balanceBefore: gw.availableBalance,
          balanceAfter: gw.availableBalance - amount,
          memberId: borrowerId,
          metadata: JSON.stringify({ borrowerId, dueDate }),
        },
      });

      const mw = await tx.wallet.findUnique({ where: { userId: borrowerId } });
      if (mw) {
        await tx.wallet.update({
          where: { id: mw.id },
          data: { availableBalance: { increment: amount }, totalCredits: { increment: amount } },
        });
        await tx.ledgerEntry.create({
          data: {
            walletId: mw.id,
            type: 'CREDIT',
            direction: 'CREDIT',
            amount,
            reference: `member_${reference}`,
            category: LedgerCategory.LOAN_DISBURSEMENT,
            balanceBefore: mw.availableBalance,
            balanceAfter: mw.availableBalance + amount,
            metadata: JSON.stringify({ groupId, source: 'group_loan' }),
          },
        });
      }

      return tx.groupLoan.create({
        data: {
          groupWalletId: gw.id,
          groupId,
          borrowerId,
          amount,
          reference,
          status: GroupLoanStatus.DISBURSED,
          dueDate,
          disbursedAt: new Date(),
        },
      });
    });

    this.events.emit(GROUP_LOAN_EVENTS.DISBURSED, { groupId, borrowerId, amount, loan });
    this.logger.log(`Group loan disbursed: group=${groupId} borrower=${borrowerId} amount=${amount}`);
    return loan;
  }

  async repay(loanId: string, amount: number) {
    const loan = await this.prisma.groupLoan.findUnique({ where: { id: loanId } });
    if (!loan) throw new NotFoundException('Loan not found');
    if (loan.status !== GroupLoanStatus.DISBURSED) throw new BadRequestException('Loan is not active');

    const repaidAmount = loan.repaidAmount + amount;
    const fullyRepaid = repaidAmount >= loan.amount;
    const reference = `repay_${loanId}_${Date.now()}`;

    await this.prisma.$transaction(async (tx) => {
      const gw = await tx.savingsGroupWallet.findUnique({ where: { id: loan.groupWalletId } });
      if (!gw) throw new NotFoundException('Group wallet not found');

      await tx.savingsGroupWallet.update({
        where: { id: gw.id },
        data: {
          availableBalance: { increment: amount },
          lendingPoolBalance: { increment: amount },
        },
      });

      await tx.groupLedgerEntry.create({
        data: {
          groupWalletId: gw.id,
          type: 'CREDIT',
          direction: 'CREDIT',
          amount,
          reference,
          category: GroupLedgerCategory.GROUP_LOAN_REPAYMENT,
          balanceBefore: gw.availableBalance,
          balanceAfter: gw.availableBalance + amount,
          memberId: loan.borrowerId,
        },
      });

      await tx.groupLoan.update({
        where: { id: loanId },
        data: {
          repaidAmount,
          status: fullyRepaid ? GroupLoanStatus.REPAID : GroupLoanStatus.DISBURSED,
          repaidAt: fullyRepaid ? new Date() : null,
        },
      });
    });

    this.events.emit(GROUP_LOAN_EVENTS.REPAID, { groupId: loan.groupId, borrowerId: loan.borrowerId, amount, fullyRepaid });
    return { loanId, repaidAmount, fullyRepaid };
  }

  getGroupLoans(groupId: string) {
    return this.prisma.groupLoan.findMany({ where: { groupId }, orderBy: { createdAt: 'desc' } });
  }

  getMemberLoans(borrowerId: string) {
    return this.prisma.groupLoan.findMany({ where: { borrowerId }, orderBy: { createdAt: 'desc' } });
  }
}
