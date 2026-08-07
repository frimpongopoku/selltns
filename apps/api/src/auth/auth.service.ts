import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { FirebaseVerifierService } from './firebase-verifier.service';
import { DEFAULT_THEME_TOKENS } from '../common/default-theme';
import { RESERVED_SLUGS } from '../common/reserved-slugs';
import { slugify } from '../common/slugify';
import type { SessionPayload } from './jwt-auth.guard';
import type { RegisterDto } from './dto/register.dto';
import type { GoogleLoginDto } from './dto/google-login.dto';
import type { CreateSpaceDto } from './dto/create-space.dto';
import type { Role, Tenant } from '@prisma/client';

class NotAllowlistedException extends ForbiddenException {
  constructor() {
    super({
      code: 'NOT_ALLOWLISTED',
      message: "This Google account isn't linked to a store yet.",
    });
  }
}

interface MembershipWithTenant {
  id: string;
  tenantId: string;
  userId: string;
  role: Role;
  acceptedAt: Date | null;
  tenant: Tenant;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly googleVerifier: FirebaseVerifierService,
  ) {}

  private issueSession(
    userId: string,
    email: string,
    tenantId: string,
    role: Role,
  ) {
    return this.jwtService.signAsync({ sub: userId, email, tenantId, role });
  }

  // The single place a membership becomes "the active space": accepts it if
  // it was still a pending invite, remembers it as the default for next
  // login, and mints a session scoped to it. Shared by login, switch, and
  // create-space so activating a space always means the same thing.
  private async activateMembership(
    membership: MembershipWithTenant,
    email: string,
  ) {
    if (!membership.acceptedAt) {
      await this.prisma.tenantMembership.update({
        where: { id: membership.id },
        data: { acceptedAt: new Date() },
      });
    }
    await this.prisma.user.update({
      where: { id: membership.userId },
      data: { lastTenantId: membership.tenantId },
    });
    const token = await this.issueSession(
      membership.userId,
      email,
      membership.tenantId,
      membership.role,
    );
    return { token, tenant: membership.tenant, role: membership.role };
  }

  async register(input: RegisterDto) {
    const { email, name } = await this.googleVerifier.verify(input.idToken);

    const storeName = input.storeName?.trim();
    if (!storeName) {
      throw new BadRequestException('Store name is required');
    }
    const slug = slugify(input.storeSlug || input.storeName);
    if (!slug) {
      throw new BadRequestException('Store URL is required');
    }
    if (RESERVED_SLUGS.has(slug)) {
      throw new ConflictException(
        'That store URL is reserved — choose another.',
      );
    }

    const [existingUser, existingTenant] = await Promise.all([
      this.prisma.user.findUnique({ where: { email } }),
      this.prisma.tenant.findUnique({ where: { slug } }),
    ]);
    if (existingUser) {
      throw new ConflictException(
        'An account already exists for this email — log in instead.',
      );
    }
    if (existingTenant) {
      throw new ConflictException(
        'That store URL is already taken — choose another.',
      );
    }

    const { tenant, user, membership } = await this.prisma.$transaction(
      async (tx) => {
        const tenant = await tx.tenant.create({
          data: {
            name: storeName,
            slug,
            themeTokens: DEFAULT_THEME_TOKENS as object,
          },
        });
        const user = await tx.user.create({
          data: { email, name, lastTenantId: tenant.id },
        });
        const membership = await tx.tenantMembership.create({
          data: {
            tenantId: tenant.id,
            userId: user.id,
            role: 'OWNER',
            acceptedAt: new Date(),
          },
        });
        return { tenant, user, membership };
      },
    );

    const token = await this.issueSession(
      user.id,
      user.email,
      tenant.id,
      membership.role,
    );
    return {
      token,
      user: { id: user.id, name: user.name, email: user.email },
      tenant,
      role: membership.role,
    };
  }

  async googleLogin(input: GoogleLoginDto) {
    const { email } = await this.googleVerifier.verify(input.idToken);

    const user = await this.prisma.user.findUnique({
      where: { email },
      include: {
        memberships: {
          include: { tenant: true },
          orderBy: { invitedAt: 'asc' },
        },
      },
    });
    if (!user || user.memberships.length === 0) {
      throw new NotAllowlistedException();
    }

    // Default into the space they were last active in; otherwise prefer an
    // already-accepted space over a pending invite, and land somewhere
    // deterministic rather than erroring if neither applies.
    const target =
      user.memberships.find((m) => m.tenantId === user.lastTenantId) ??
      user.memberships.find((m) => m.acceptedAt) ??
      user.memberships[0];

    const { token, tenant, role } = await this.activateMembership(
      target,
      email,
    );
    return {
      token,
      user: { id: user.id, name: user.name, email: user.email },
      tenant,
      role,
    };
  }

  // Lets an already-authenticated user spin up a brand-new space without
  // going through the public register flow (which rejects existing
  // accounts). They become OWNER of it immediately.
  async createSpace(session: SessionPayload, input: CreateSpaceDto) {
    const storeName = input.storeName?.trim();
    if (!storeName) {
      throw new BadRequestException('Store name is required');
    }
    const slug = slugify(input.storeSlug || input.storeName);
    if (!slug) {
      throw new BadRequestException('Store URL is required');
    }
    if (RESERVED_SLUGS.has(slug)) {
      throw new ConflictException(
        'That store URL is reserved — choose another.',
      );
    }
    const existingTenant = await this.prisma.tenant.findUnique({
      where: { slug },
    });
    if (existingTenant) {
      throw new ConflictException(
        'That store URL is already taken — choose another.',
      );
    }
    const user = await this.prisma.user.findUnique({
      where: { id: session.sub },
    });
    if (!user) {
      throw new UnauthorizedException('Session no longer valid');
    }

    const { tenant, membership } = await this.prisma.$transaction(
      async (tx) => {
        const tenant = await tx.tenant.create({
          data: {
            name: storeName,
            slug,
            themeTokens: DEFAULT_THEME_TOKENS as object,
          },
        });
        const membership = await tx.tenantMembership.create({
          data: {
            tenantId: tenant.id,
            userId: user.id,
            role: 'OWNER',
            acceptedAt: new Date(),
          },
        });
        await tx.user.update({
          where: { id: user.id },
          data: { lastTenantId: tenant.id },
        });
        return { tenant, membership };
      },
    );

    const token = await this.issueSession(
      user.id,
      user.email,
      tenant.id,
      membership.role,
    );
    return {
      token,
      user: { id: user.id, name: user.name, email: user.email },
      tenant,
      role: membership.role,
    };
  }

  // Re-scopes the current session to another space the user already
  // belongs to (accepted or still-pending — switching into a pending
  // invite is how it gets accepted, same as logging in on it would be).
  async switchSpace(session: SessionPayload, tenantId: string) {
    const membership = await this.prisma.tenantMembership.findUnique({
      where: { tenantId_userId: { tenantId, userId: session.sub } },
      include: { tenant: true },
    });
    if (!membership) {
      throw new ForbiddenException("You don't have access to that space.");
    }
    const { token, tenant, role } = await this.activateMembership(
      membership,
      session.email,
    );
    return { token, tenant, role };
  }

  async me(session: SessionPayload) {
    const user = await this.prisma.user.findUnique({
      where: { id: session.sub },
      include: {
        memberships: {
          include: { tenant: true },
          orderBy: { invitedAt: 'asc' },
        },
      },
    });
    const membership = user?.memberships.find(
      (m) => m.tenantId === session.tenantId,
    );
    if (!user || !membership) {
      throw new UnauthorizedException('Session no longer valid');
    }
    return {
      user: { id: user.id, name: user.name, email: user.email },
      tenant: membership.tenant,
      role: membership.role,
      spaces: user.memberships.map((m) => ({
        tenantId: m.tenantId,
        name: m.tenant.name,
        slug: m.tenant.slug,
        role: m.role,
        pending: !m.acceptedAt,
      })),
    };
  }
}
