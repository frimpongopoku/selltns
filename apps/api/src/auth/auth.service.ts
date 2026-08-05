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
import type { Role } from '@prisma/client';

class NotAllowlistedException extends ForbiddenException {
  constructor() {
    super({
      code: 'NOT_ALLOWLISTED',
      message: "This Google account isn't linked to a store yet.",
    });
  }
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly googleVerifier: FirebaseVerifierService,
  ) {}

  private issueSession(userId: string, email: string, tenantId: string, role: Role) {
    return this.jwtService.signAsync({ sub: userId, email, tenantId, role });
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
      throw new ConflictException('That store URL is reserved — choose another.');
    }

    const [existingUser, existingTenant] = await Promise.all([
      this.prisma.user.findUnique({ where: { email } }),
      this.prisma.tenant.findUnique({ where: { slug } }),
    ]);
    if (existingUser) {
      throw new ConflictException('An account already exists for this email — log in instead.');
    }
    if (existingTenant) {
      throw new ConflictException('That store URL is already taken — choose another.');
    }

    const { tenant, user, membership } = await this.prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          name: storeName,
          slug,
          themeTokens: DEFAULT_THEME_TOKENS as object,
        },
      });
      const user = await tx.user.create({ data: { email, name } });
      const membership = await tx.tenantMembership.create({
        data: {
          tenantId: tenant.id,
          userId: user.id,
          role: 'OWNER',
          acceptedAt: new Date(),
        },
      });
      return { tenant, user, membership };
    });

    const token = await this.issueSession(user.id, user.email, tenant.id, membership.role);
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
      include: { memberships: { include: { tenant: true } } },
    });
    const membership = user?.memberships[0];
    if (!user || !membership) {
      throw new NotAllowlistedException();
    }

    const token = await this.issueSession(user.id, user.email, membership.tenantId, membership.role);
    return {
      token,
      user: { id: user.id, name: user.name, email: user.email },
      tenant: membership.tenant,
      role: membership.role,
    };
  }

  async me(session: SessionPayload) {
    const user = await this.prisma.user.findUnique({
      where: { id: session.sub },
      include: { memberships: { where: { tenantId: session.tenantId }, include: { tenant: true } } },
    });
    const membership = user?.memberships[0];
    if (!user || !membership) {
      throw new UnauthorizedException('Session no longer valid');
    }
    return {
      user: { id: user.id, name: user.name, email: user.email },
      tenant: membership.tenant,
      role: membership.role,
    };
  }
}
