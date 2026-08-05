import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { SessionPayload } from './jwt-auth.guard';

export const CurrentUser = createParamDecorator((_: unknown, ctx: ExecutionContext): SessionPayload => {
  const request = ctx.switchToHttp().getRequest<Request & { user: SessionPayload }>();
  return request.user;
});
