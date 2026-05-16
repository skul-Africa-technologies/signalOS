import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { MetricsService } from './metrics.service';

@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(private readonly metrics: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const end = this.metrics.httpRequestDuration.startTimer({
      method: req.method,
      route: req.route?.path ?? req.url,
    });

    return next.handle().pipe(
      tap({
        next: () => {
          const status = context.switchToHttp().getResponse().statusCode;
          end({ status_code: String(status) });
          this.metrics.httpRequestTotal.labels(req.method, req.route?.path ?? req.url, String(status)).inc();
        },
        error: (err) => {
          const status = err.status ?? 500;
          end({ status_code: String(status) });
          this.metrics.httpErrorTotal.labels(req.method, req.route?.path ?? req.url, String(status)).inc();
        },
      }),
    );
  }
}
