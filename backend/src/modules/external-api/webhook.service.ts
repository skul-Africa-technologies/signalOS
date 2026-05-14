import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateWebhookSubscriptionDto } from './dto/webhook.dto';
import { WebhookDeliveryStatus } from '@prisma/client';
import * as crypto from 'crypto';
import axios from 'axios';

const MAX_ATTEMPTS = 5;
const RETRY_DELAYS_MS = [0, 30_000, 300_000, 1_800_000, 7_200_000]; // 0s, 30s, 5m, 30m, 2h

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  constructor(private readonly prisma: PrismaService) {}

  async subscribe(organizationId: string, dto: CreateWebhookSubscriptionDto) {
    const secret = crypto.randomBytes(32).toString('hex');
    return this.prisma.webhookSubscription.create({
      data: { organizationId, url: dto.url, events: dto.events, secret },
      select: { id: true, url: true, events: true, active: true, createdAt: true },
    });
  }

  async listSubscriptions(organizationId: string) {
    return this.prisma.webhookSubscription.findMany({
      where: { organizationId },
      select: { id: true, url: true, events: true, active: true, createdAt: true },
    });
  }

  async deleteSubscription(id: string, organizationId: string) {
    const sub = await this.prisma.webhookSubscription.findFirst({ where: { id, organizationId } });
    if (!sub) throw new NotFoundException('Webhook subscription not found');
    return this.prisma.webhookSubscription.update({ where: { id }, data: { active: false } });
  }

  /** Emit an event to all matching active subscriptions */
  async emit(event: string, payload: Record<string, unknown>, organizationId?: string) {
    const where: any = { active: true, events: { has: event } };
    if (organizationId) where.organizationId = organizationId;

    const subscriptions = await this.prisma.webhookSubscription.findMany({ where });

    await Promise.all(
      subscriptions.map((sub) =>
        this.prisma.webhookDelivery.create({
          data: { subscriptionId: sub.id, event, payload: payload as any, status: WebhookDeliveryStatus.PENDING },
        }).then((delivery) => this.deliver(delivery.id)),
      ),
    );
  }

  /** Deliver a single webhook with retry logic */
  async deliver(deliveryId: string): Promise<void> {
    const delivery = await this.prisma.webhookDelivery.findUnique({
      where: { id: deliveryId },
      include: { subscription: true },
    });

    if (!delivery || delivery.status === WebhookDeliveryStatus.SUCCESS) return;
    if (delivery.attempts >= MAX_ATTEMPTS) {
      await this.prisma.webhookDelivery.update({ where: { id: deliveryId }, data: { status: WebhookDeliveryStatus.EXHAUSTED } });
      return;
    }

    const timestamp = Date.now();
    const body = JSON.stringify({ event: delivery.event, payload: delivery.payload, timestamp });
    const signature = this.sign(body, delivery.subscription.secret);

    try {
      const response = await axios.post(delivery.subscription.url, body, {
        headers: {
          'Content-Type': 'application/json',
          'X-SignalOS-Signature': signature,
          'X-SignalOS-Timestamp': String(timestamp),
          'X-SignalOS-Event': delivery.event,
        },
        timeout: 10_000,
      });

      await this.prisma.webhookDelivery.update({
        where: { id: deliveryId },
        data: {
          status: WebhookDeliveryStatus.SUCCESS,
          attempts: delivery.attempts + 1,
          lastAttemptAt: new Date(),
          responseStatus: response.status,
          responseBody: String(response.data).slice(0, 500),
        },
      });

      this.logger.log(`Webhook delivered: ${delivery.event} → ${delivery.subscription.url}`);
    } catch (err: any) {
      const nextAttempt = delivery.attempts + 1;
      const exhausted = nextAttempt >= MAX_ATTEMPTS;
      const nextRetryAt = exhausted ? null : new Date(Date.now() + RETRY_DELAYS_MS[nextAttempt]);

      await this.prisma.webhookDelivery.update({
        where: { id: deliveryId },
        data: {
          status: exhausted ? WebhookDeliveryStatus.EXHAUSTED : WebhookDeliveryStatus.FAILED,
          attempts: nextAttempt,
          lastAttemptAt: new Date(),
          nextRetryAt,
          responseStatus: err.response?.status ?? null,
          responseBody: String(err.message).slice(0, 500),
        },
      });

      this.logger.warn(`Webhook failed (attempt ${nextAttempt}/${MAX_ATTEMPTS}): ${delivery.event} → ${delivery.subscription.url}`);

      // Schedule retry
      if (nextRetryAt) {
        const delay = RETRY_DELAYS_MS[nextAttempt];
        setTimeout(() => this.deliver(deliveryId), delay);
      }
    }
  }

  /** HMAC-SHA256 signature: `sha256=<hex>` */
  sign(body: string, secret: string): string {
    return 'sha256=' + crypto.createHmac('sha256', secret).update(body).digest('hex');
  }

  /** Verify incoming webhook signature (for consumers) */
  verify(body: string, secret: string, signature: string): boolean {
    const expected = this.sign(body, secret);
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  }
}
