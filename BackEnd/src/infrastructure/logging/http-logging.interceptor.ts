import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Request, Response } from 'express';
import { Observable, tap } from 'rxjs';

@Injectable()
export class HttpLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const req = context.switchToHttp().getRequest<Request>();
    const res = context.switchToHttp().getResponse<Response>();
    const requestId = (req.headers['x-request-id'] as string) ?? randomUUID();
    req.headers['x-request-id'] = requestId;
    res.setHeader('X-Request-Id', requestId);

    const { method, originalUrl } = req;
    const started = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          this.logger.log(
            JSON.stringify({
              level: 'info',
              requestId,
              method,
              path: originalUrl,
              statusCode: res.statusCode,
              durationMs: Date.now() - started,
            }),
          );
        },
        error: (err: Error) => {
          this.logger.error(
            JSON.stringify({
              level: 'error',
              requestId,
              method,
              path: originalUrl,
              statusCode: res.statusCode,
              durationMs: Date.now() - started,
              error: err.message,
            }),
          );
        },
      }),
    );
  }
}
