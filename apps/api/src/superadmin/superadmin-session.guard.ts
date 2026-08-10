import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';

export interface SuperAdminSessionPayload {
  sub: string;
  email: string;
  kind: 'SUPERADMIN';
}

// Deliberately parallel to (not reusing) JwtAuthGuard: a superadmin session
// has no tenantId/Role, so it isn't a valid SessionPayload — see the
// plan/comment in jwt-auth.guard.ts for why the two are kept from ever
// being interchangeable.
@Injectable()
export class SuperAdminGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<Request & { superAdmin?: SuperAdminSessionPayload }>();
    const authHeader = request.headers.authorization;
    const token = authHeader?.startsWith('Bearer ')
      ? authHeader.slice(7)
      : undefined;

    if (!token) {
      throw new UnauthorizedException('Missing session token');
    }

    try {
      const payload =
        await this.jwtService.verifyAsync<SuperAdminSessionPayload>(token);
      if (payload.kind !== 'SUPERADMIN') {
        throw new UnauthorizedException('Invalid or expired session');
      }
      request.superAdmin = payload;
      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired session');
    }
  }
}
