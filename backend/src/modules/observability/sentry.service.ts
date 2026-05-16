import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as Sentry from '@sentry/node';

@Injectable()
export class SentryService implements OnModuleInit {
  private readonly logger = new Logger(SentryService.name);
  private enabled = false;

  onModuleInit() {
    const dsn = process.env.SENTRY_DSN;
    if (!dsn) {
      this.logger.warn('SENTRY_DSN not set — error tracking disabled');
      return;
    }
    Sentry.init({
      dsn,
      environment: process.env.NODE_ENV ?? 'development',
      tracesSampleRate: 0.1,
    });
    this.enabled = true;
    this.logger.log('Sentry error tracking initialized');
  }

  captureException(error: Error, context?: Record<string, any>) {
    if (!this.enabled) return;
    Sentry.withScope((scope) => {
      if (context) scope.setExtras(context);
      Sentry.captureException(error);
    });
  }

  captureMessage(message: string, level: Sentry.SeverityLevel = 'info', context?: Record<string, any>) {
    if (!this.enabled) return;
    Sentry.withScope((scope) => {
      if (context) scope.setExtras(context);
      Sentry.captureMessage(message, level);
    });
  }

  setUser(id: string, extra?: Record<string, any>) {
    if (!this.enabled) return;
    Sentry.setUser({ id, ...extra });
  }
}
