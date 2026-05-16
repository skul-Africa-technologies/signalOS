import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../../prisma/prisma.service';
import { TreasuryForecastEngine } from '../engines/treasury-forecast.engine';
import { FraudProbabilityEngine } from '../engines/prediction.engines';
import { AUTONOMOUS_THRESHOLDS, PREDICTION_EVENTS } from '../prediction.constants';

/**
 * Autonomous adaptation layer.
 * Monitors predictions and self-adjusts platform controls without human intervention.
 */
@Injectable()
export class AutonomousAdaptationService {
  private readonly logger = new Logger(AutonomousAdaptationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly treasuryEngine: TreasuryForecastEngine,
    private readonly fraudEngine: FraudProbabilityEngine,
    private readonly events: EventEmitter2,
  ) {}

  // ─── Treasury Adaptation ────────────────────────────────────────────────────

  async adaptTreasury(groupId: string): Promise<void> {
    const forecast = await this.treasuryEngine.forecast(groupId);

    if (forecast.depletionRisk > 0.7 || forecast.reserveAdequacy === 'CRITICAL') {
      this.logger.warn(`[AUTONOMOUS] Treasury CRITICAL for group ${groupId} — tightening controls`);

      const wallet = await this.prisma.savingsGroupWallet.findUnique({ where: { groupId } });
      if (wallet && wallet.lendingPoolBalance > 0) {
        await this.prisma.savingsGroupWallet.update({
          where: { groupId },
          data: { lendingPoolBalance: wallet.lendingPoolBalance * 0.7 },
        });
      }

      this.events.emit(PREDICTION_EVENTS.TREASURY_RISK_INCREASED, {
        groupId,
        depletionRisk: forecast.depletionRisk,
        reserveAdequacy: forecast.reserveAdequacy,
        action: 'LENDING_POOL_REDUCED',
        timestamp: new Date(),
      });

      this.events.emit(PREDICTION_EVENTS.AUTONOMOUS_THRESHOLD_ADJUSTED, {
        entity: 'treasury',
        groupId,
        adjustment: 'lending_capacity_reduced',
        reason: 'Autonomous treasury stress response',
      });
    } else if (forecast.trajectory === 'POSITIVE' && forecast.reserveAdequacy === 'ADEQUATE') {
      this.events.emit(PREDICTION_EVENTS.TREASURY_RISK_DECREASED, {
        groupId,
        trajectory: forecast.trajectory,
        action: 'CONTROLS_RELAXED',
      });
    }
  }

  // ─── Trust Adaptation ───────────────────────────────────────────────────────

  async adaptTrust(userId: string): Promise<void> {
    const profile = await this.prisma.economicProfile.findUnique({ where: { userId } });
    if (!profile) return;

    const { trustScore } = profile;

    if (trustScore < AUTONOMOUS_THRESHOLDS.TRUST_CRITICAL_SCORE) {
      this.logger.warn(`[AUTONOMOUS] Trust CRITICAL for user ${userId} (score=${trustScore})`);
      await this.prisma.economicProfile.update({ where: { userId }, data: { riskLevel: 'Very High' } });
      this.events.emit(PREDICTION_EVENTS.TRUST_TRAJECTORY_CHANGED, {
        userId, trustScore, trajectory: 'CRITICAL', action: 'RISK_ESCALATED',
      });
    } else if (trustScore >= 70) {
      await this.prisma.economicProfile.update({ where: { userId }, data: { riskLevel: 'Low' } });
      this.events.emit(PREDICTION_EVENTS.TRUST_TRAJECTORY_CHANGED, {
        userId, trustScore, trajectory: 'POSITIVE', action: 'LOAN_ELIGIBILITY_EXPANDED',
      });
    }
  }

  // ─── Fraud Adaptation ───────────────────────────────────────────────────────

  async adaptFraud(userId: string): Promise<void> {
    const fraudForecast = await this.fraudEngine.forecast(userId);

    if (fraudForecast.fraudProbability >= AUTONOMOUS_THRESHOLDS.FRAUD_ESCALATION_PROBABILITY) {
      this.logger.warn(`[AUTONOMOUS] Fraud HIGH for user ${userId} (prob=${fraudForecast.fraudProbability.toFixed(2)}) — restricting wallet`);

      const wallet = await this.prisma.wallet.findUnique({ where: { userId } });
      if (wallet && wallet.availableBalance > 0) {
        const freezeAmount = wallet.availableBalance * 0.5;
        await this.prisma.wallet.update({
          where: { userId },
          data: {
            frozenBalance: { increment: freezeAmount },
            availableBalance: { decrement: freezeAmount },
          },
        });
      }

      this.events.emit(PREDICTION_EVENTS.FRAUD_RISK_ESCALATED, {
        userId,
        fraudProbability: fraudForecast.fraudProbability,
        anomalySignals: fraudForecast.anomalySignals,
        action: 'WALLET_PARTIALLY_FROZEN',
        timestamp: new Date(),
      });
    }
  }
}
