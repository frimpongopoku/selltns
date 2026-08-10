import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { SuperAdminSessionPayload } from './superadmin-session.guard';

export const CurrentSuperAdmin = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): SuperAdminSessionPayload => {
    const request = ctx
      .switchToHttp()
      .getRequest<Request & { superAdmin: SuperAdminSessionPayload }>();
    return request.superAdmin;
  },
);
