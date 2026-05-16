import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from './health.controller';
import { MetricsController } from './metrics.controller';
import { MetricsService } from './metrics.service';
import { AppLoggerService } from './logger.service';
import { SentryService } from './sentry.service';
import { AlertService } from './alert.service';
import { MetricsInterceptor } from './metrics.interceptor';

@Module({
  imports: [TerminusModule],
  controllers: [HealthController, MetricsController],
  providers: [MetricsService, AppLoggerService, SentryService, AlertService, MetricsInterceptor],
  exports: [MetricsService, AppLoggerService, SentryService, AlertService, MetricsInterceptor],
})
export class ObservabilityModule {}
