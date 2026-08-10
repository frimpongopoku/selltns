import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import type { Role } from '@prisma/client';

export interface SessionPayload {
  sub: string;
  email: string;
  tenantId: string;
  role: Role;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request & { user?: SessionPayload }>();
    const authHeader = request.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;

    if (!token) {
      throw new UnauthorizedException('Missing session token');
    }

    try {
      const payload = await this.jwtService.verifyAsync<
        SessionPayload & { kind?: string }
      >(token);
      // Superadmin tokens are a distinct, non-tenant session space (see
      // superadmin/superadmin-session.guard.ts) — reject them here even
      // though the signature is valid, so the two never become
      // interchangeable by accident.
      if (payload.kind === 'SUPERADMIN') {
        throw new UnauthorizedException('Invalid or expired session');
      }
      request.user = payload;
      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired session');
    }
  }
}
