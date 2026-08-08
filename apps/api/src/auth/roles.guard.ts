import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import type { Role } from '@prisma/client';
import { ROLES_KEY } from './roles.decorator';
import type { SessionPayload } from './jwt-auth.guard';

// Runs after JwtAuthGuard (request.user must already be set). A route with
// no @Roles(...) requires only a valid session, any role. Ordering matters:
// @UseGuards(JwtAuthGuard, RolesGuard).
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Role[] | undefined>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request & { user?: SessionPayload }>();
    const role = request.user?.role;
    if (!role || !required.includes(role)) {
      throw new ForbiddenException("Your role doesn't have access to this action.");
    }
    return true;
  }
}
