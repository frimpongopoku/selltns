import {
  CallHandler,
  ExecutionContext,
  HttpException,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { catchError, tap } from 'rxjs/operators';
import { throwError } from 'rxjs';
import type { SessionPayload } from '../auth/jwt-auth.guard';

// Structured, one-line-per-request logs to stdout — cheap, never blocks the
// response (the log write happens after the response stream via `tap`, off
// the request's own timing), and gives context Sentry alone won't: slow
// requests, and which tenant/role made a call, even when nothing errored.
// Viewable via Railway's log viewer in production; useful for tracing a
// specific user's report back to what actually happened.
@Injectable()
export class RequestLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler) {
    const request = context.switchToHttp().getRequest<Request & { user?: SessionPayload }>();
    const response = context.switchToHttp().getResponse<Response>();
    const start = Date.now();

    return next.handle().pipe(
      tap(() => this.log(request, response.statusCode, start)),
      catchError((err: unknown) => {
        const status = err instanceof HttpException ? err.getStatus() : 500;
        this.log(request, status, start);
        return throwError(() => err);
      }),
    );
  }

  private log(request: Request & { user?: SessionPayload }, status: number, start: number) {
    this.logger.log(
      JSON.stringify({
        method: request.method,
        path: request.originalUrl,
        status,
        durationMs: Date.now() - start,
        tenantId: request.user?.tenantId,
        role: request.user?.role,
      }),
    );
  }
}
