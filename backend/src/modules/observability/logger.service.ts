import { Injectable, LoggerService } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { createLogger, format, transports, Logger } from 'winston';

@Injectable()
export class AppLoggerService implements LoggerService {
  private readonly logger: Logger;

  constructor() {
    this.logger = createLogger({
      level: process.env.LOG_LEVEL ?? 'info',
      format: format.combine(
        format.timestamp(),
        format.errors({ stack: true }),
        format.json(),
      ),
      defaultMeta: { service: 'signalos-backend', version: process.env.npm_package_version },
      transports: [new transports.Console()],
    });
  }

  log(message: string, context?: string) {
    this.logger.info(message, { context });
  }

  error(message: string, trace?: string, context?: string) {
    this.logger.error(message, { trace, context });
  }

  warn(message: string, context?: string) {
    this.logger.warn(message, { context });
  }

  debug(message: string, context?: string) {
    this.logger.debug(message, { context });
  }

  verbose(message: string, context?: string) {
    this.logger.verbose(message, { context });
  }

  withCorrelationId(correlationId?: string) {
    const id = correlationId ?? randomUUID();
    return {
      log: (msg: string, ctx?: string) => this.logger.info(msg, { correlationId: id, context: ctx }),
      error: (msg: string, trace?: string, ctx?: string) => this.logger.error(msg, { correlationId: id, trace, context: ctx }),
      warn: (msg: string, ctx?: string) => this.logger.warn(msg, { correlationId: id, context: ctx }),
    };
  }
}
