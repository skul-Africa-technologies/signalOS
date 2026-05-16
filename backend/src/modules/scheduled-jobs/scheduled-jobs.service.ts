import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../prisma/prisma.service';
import { RepaymentService } from '../repayment/repayment.service';
import { TrustScoreService } from '../trust-score/trust-score.service';
import { CooperativeTreasuryService } from '../cooperative/cooperative-treasury.service';
import { IntelligenceEngineService } from '../intelligence-engine/intelligence-engine.service';
import { NotificationService } from '../notification/notification.service';
import { PredictiveIntelligenceService } from '../predictive-intelligence/predictive-intelligence.service';
import { NotificationChannel, NotificationType, RepaymentScheduleStatus } from '../../common/prisma-enums';

@Injectable()
export class ScheduledJobsService {
  private readonly logger = new Logger(ScheduledJobsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly repayment: RepaymentService,
    private readonly trustScore: TrustScoreService,
    private readonly treasury: CooperativeTreasuryService,
    private readonly intelligence: IntelligenceEngineService,
    private readonly notifications: NotificationService,
    private readonly predictive: PredictiveIntelligenceService,
    private readonly events: EventEmitter2,
  ) {}

  @Cron('0 2 * * *', { name: 'daily-overdue-scan' })
  async dailyOverdueScan() {
    this.logger.log('[CRON] Daily overdue scan starting');
    try {
      const count = await this.repayment.detectAndMarkOverdue();
      this.logger.log(`[CRON] Overdue scan complete: ${count} schedules marked`);
    } catch (err: any) {
      this.logger.error(`[CRON] Overdue scan failed: ${err.message}`);
    }
  }

  @Cron('0 3 * * *', { name: 'daily-default-scan' })
  async dailyDefaultScan() {
    this.logger.log('[CRON] Daily default scan starting');
    try {
      const count = await this.repayment.detectDefaults();
      this.logger.log(`[CRON] Default scan complete: ${count} loans defaulted`);
    } catch (err: any) {
      this.logger.error(`[CRON] Default scan failed: ${err.message}`);
    }
  }

  @Cron('0 4 * * *', { name: 'daily-repayment-reminders' })
  async dailyRepaymentReminders() {
    this.logger.log('[CRON] Sending repayment due reminders');
    try {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dayAfter = new Date(tomorrow);
      dayAfter.setDate(dayAfter.getDate() + 1);
      const dueSoon = await this.prisma.loanRepaymentSchedule.findMany({
        where: { status: RepaymentScheduleStatus.PENDING, dueDate: { gte: tomorrow, lt: dayAfter } },
      });
      for (const schedule of dueSoon) {
        const loan = await this.prisma.loanDisbursement.findUnique({ where: { id: schedule.loanId } });
        if (!loan) continue;
        await this.notifications.send({
          userId: loan.userId,
          type: NotificationType.REPAYMENT_DUE,
          title: 'Repayment Due Tomorrow',
          message: `Your loan installment of ₦${schedule.amountDue.toLocaleString()} is due tomorrow.`,
          channels: [NotificationChannel.IN_APP, NotificationChannel.SMS],
        });
      }
      this.logger.log(`[CRON] Sent ${dueSoon.length} repayment reminders`);
    } catch (err: any) {
      this.logger.error(`[CRON] Repayment reminders failed: ${err.message}`);
    }
  }

  @Cron('0 5 * * *', { name: 'daily-trust-decay' })
  async dailyTrustDecay() {
    this.logger.log('[CRON] Autonomous trust decay scan');
    try {
      const cutoff = new Date(Date.now() - 30 * 86400000);
      const inactive = await this.prisma.user.findMany({
        where: { transactions: { none: { createdAt: { gte: cutoff } } } },
        select: { id: true },
        take: 200,
      });
      for (const user of inactive) {
        await this.trustScore.recalculate(user.id);
      }
      this.logger.log(`[CRON] Trust decay applied to ${inactive.length} inactive users`);
    } catch (err: any) {
      this.logger.error(`[CRON] Trust decay failed: ${err.message}`);
    }
  }

  // ─── Phase 5: Daily Prediction Regeneration (01:00 UTC) ────────────────────

  @Cron('0 1 * * *', { name: 'daily-prediction-regeneration' })
  async dailyPredictionRegeneration() {
    this.logger.log('[CRON] Daily prediction regeneration starting');
    try {
      const users = await this.prisma.user.findMany({ select: { id: true }, take: 500 });
      const processed = await this.predictive.batchRegeneratePredictions(users.map((u) => u.id));
      this.logger.log(`[CRON] Predictions regenerated for ${processed}/${users.length} users`);
    } catch (err: any) {
      this.logger.error(`[CRON] Prediction regeneration failed: ${err.message}`);
    }
  }

  // ─── Phase 5: Daily Treasury Adaptation (01:30 UTC) ────────────────────────

  @Cron('30 1 * * *', { name: 'daily-treasury-adaptation' })
  async dailyTreasuryAdaptation() {
    this.logger.log('[CRON] Daily autonomous treasury adaptation');
    try {
      const groups = await this.prisma.savingsGroup.findMany({ select: { id: true } });
      for (const group of groups) {
        try {
          await this.predictive.runTreasuryAdaptation(group.id);
        } catch { /* skip individual */ }
      }
      this.logger.log(`[CRON] Treasury adaptation complete for ${groups.length} groups`);
    } catch (err: any) {
      this.logger.error(`[CRON] Treasury adaptation failed: ${err.message}`);
    }
  }

  @Cron('0 6 * * 1', { name: 'weekly-intelligence-snapshots' })
  async weeklyIntelligenceSnapshots() {
    this.logger.log('[CRON] Weekly intelligence snapshots starting');
    try {
      const users = await this.prisma.user.findMany({ select: { id: true }, take: 500 });
      let processed = 0;
      for (const user of users) {
        try { await this.intelligence.analyseUser(user.id); processed++; } catch { /* skip */ }
      }
      this.logger.log(`[CRON] Weekly snapshots: ${processed}/${users.length} users processed`);
    } catch (err: any) {
      this.logger.error(`[CRON] Weekly snapshots failed: ${err.message}`);
    }
  }

  @Cron('0 7 * * 1', { name: 'weekly-treasury-health' })
  async weeklyTreasuryHealth() {
    this.logger.log('[CRON] Weekly treasury health evaluation');
    try {
      const groups = await this.prisma.savingsGroup.findMany({ select: { id: true } });
      for (const group of groups) {
        try {
          const health = await this.treasury.updateGroupProfile(group.id);
          if (health.sustainabilityScore < 40) {
            this.events.emit('treasury.health.changed', { groupId: group.id, health: 'WEAK', score: health.sustainabilityScore });
          }
        } catch { /* skip */ }
      }
      this.logger.log(`[CRON] Treasury health evaluated for ${groups.length} groups`);
    } catch (err: any) {
      this.logger.error(`[CRON] Treasury health failed: ${err.message}`);
    }
  }

  @Cron('0 8 * * 1', { name: 'weekly-savings-reminders' })
  async weeklySavingsReminders() {
    this.logger.log('[CRON] Weekly savings reminders');
    try {
      const members = await this.prisma.groupMember.findMany({ select: { userId: true }, distinct: ['userId'], take: 500 });
      for (const m of members) {
        await this.notifications.send({
          userId: m.userId,
          type: NotificationType.SAVINGS_REMINDER,
          title: 'Weekly Savings Reminder',
          message: 'Keep your savings consistent — it builds your financial trust score.',
          channels: [NotificationChannel.IN_APP],
        });
      }
      this.logger.log(`[CRON] Savings reminders sent to ${members.length} members`);
    } catch (err: any) {
      this.logger.error(`[CRON] Savings reminders failed: ${err.message}`);
    }
  }

  @Cron('0 8 1 * *', { name: 'monthly-analytics' })
  async monthlyAnalytics() {
    this.logger.log('[CRON] Monthly analytics aggregation starting');
    try {
      const [userCount, loanCount, repaymentCount] = await Promise.all([
        this.prisma.user.count(),
        this.prisma.loanDisbursement.count(),
        this.prisma.loanRepayment.count(),
      ]);
      this.logger.log(`[CRON] Monthly analytics: users=${userCount} loans=${loanCount} repayments=${repaymentCount}`);
      this.events.emit('analytics.monthly.generated', { userCount, loanCount, repaymentCount, generatedAt: new Date() });
    } catch (err: any) {
      this.logger.error(`[CRON] Monthly analytics failed: ${err.message}`);
    }
  }

  @Cron('0 9 1 * *', { name: 'monthly-trust-evolution' })
  async monthlyTrustEvolution() {
    this.logger.log('[CRON] Monthly autonomous trust evolution');
    try {
      const activeUsers = await this.prisma.user.findMany({
        where: { transactions: { some: {} } },
        select: { id: true },
        take: 1000,
      });
      let evolved = 0;
      for (const user of activeUsers) {
        try { await this.intelligence.analyseUser(user.id); evolved++; } catch { /* skip */ }
      }
      this.logger.log(`[CRON] Monthly trust evolution: ${evolved} users re-analysed`);
    } catch (err: any) {
      this.logger.error(`[CRON] Monthly trust evolution failed: ${err.message}`);
    }
  }
}
