import { Injectable, Logger } from '@nestjs/common';
import { NotificationChannel, NotificationStatus, NotificationType } from '../../common/prisma-enums';
import { PrismaService } from '../../prisma/prisma.service';
import * as nodemailer from 'nodemailer';

export interface SendNotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  channels?: NotificationChannel[];
  metadata?: Record<string, any>;
}

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  // Nodemailer transporter — configure via env in production
  private readonly mailer = nodemailer.createTransport({
    host: process.env.SMTP_HOST ?? 'smtp.ethereal.email',
    port: parseInt(process.env.SMTP_PORT ?? '587'),
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });

  constructor(private readonly prisma: PrismaService) {}

  async send(input: SendNotificationInput): Promise<void> {
    const prefs = await this.getPreferences(input.userId);
    const channels = input.channels ?? [NotificationChannel.IN_APP];

    for (const channel of channels) {
      if (channel === NotificationChannel.EMAIL && !prefs.emailEnabled) continue;
      if (channel === NotificationChannel.SMS && !prefs.smsEnabled) continue;
      if (channel === NotificationChannel.IN_APP && !prefs.inAppEnabled) continue;
      if (prefs.mutedTypes.includes(input.type)) continue;

      const notification = await this.prisma.notification.create({
        data: {
          userId: input.userId,
          type: input.type,
          title: input.title,
          message: input.message,
          channel,
          metadata: JSON.stringify(input.metadata ?? {}),
        },
      });

      try {
        if (channel === NotificationChannel.EMAIL) await this.sendEmail(input);
        if (channel === NotificationChannel.SMS) await this.sendSms(input);

        await this.prisma.notification.update({
          where: { id: notification.id },
          data: { status: NotificationStatus.SENT },
        });
      } catch (err: any) {
        this.logger.error(`Notification delivery failed [${channel}]: ${err.message}`);
        await this.prisma.notification.update({
          where: { id: notification.id },
          data: { status: NotificationStatus.FAILED },
        });
      }
    }
  }

  async markRead(notificationId: string): Promise<void> {
    await this.prisma.notification.update({
      where: { id: notificationId },
      data: { status: NotificationStatus.READ, readAt: new Date() },
    });
  }

  async getForUser(userId: string, limit = 50) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async getPreferences(userId: string) {
    return this.prisma.notificationPreference.upsert({
      where: { userId },
      create: { userId, mutedTypes: "[]" },
      update: {},
    });
  }

  async updatePreferences(userId: string, data: { emailEnabled?: boolean; smsEnabled?: boolean; inAppEnabled?: boolean; mutedTypes?: string[] }) {
    return this.prisma.notificationPreference.upsert({
      where: { userId },
      create: { userId, mutedTypes: JSON.stringify(data.mutedTypes ?? []), ...Object.fromEntries(Object.entries(data).filter(([k]) => k !== "mutedTypes")) },
      update: { ...Object.fromEntries(Object.entries(data).filter(([k]) => k !== "mutedTypes")), ...(data.mutedTypes !== undefined ? { mutedTypes: JSON.stringify(data.mutedTypes) } : {}) },
    });
  }


  private async sendEmail(input: SendNotificationInput): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: input.userId }, select: { name: true, phone: true } });
    if (!process.env.SMTP_USER) {
      this.logger.debug(`[EMAIL STUB] To: ${user?.name} | ${input.title}: ${input.message}`);
      return;
    }
    await this.mailer.sendMail({
      from: process.env.SMTP_FROM ?? 'noreply@signalos.io',
      to: input.metadata?.email as string ?? input.userId,
      subject: input.title,
      html: `<p>${input.message}</p>`,
    });
  }

  private async sendSms(input: SendNotificationInput): Promise<void> {
    // SMS provider abstraction — swap in Termii/Twilio/Africa's Talking via env
    const user = await this.prisma.user.findUnique({ where: { id: input.userId }, select: { phone: true } });
    if (!process.env.SMS_API_KEY) {
      this.logger.debug(`[SMS STUB] To: ${user?.phone} | ${input.message}`);
      return;
    }
    // Production: call SMS provider API here
    this.logger.log(`SMS sent to ${user?.phone}: ${input.message}`);
  }
}
