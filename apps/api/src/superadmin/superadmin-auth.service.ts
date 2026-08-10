import { ForbiddenException, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { FirebaseVerifierService } from '../auth/firebase-verifier.service';
import type { GoogleLoginDto } from '../auth/dto/google-login.dto';
import type { SuperAdminSessionPayload } from './superadmin-session.guard';

// Mirrors NotAllowlistedException in auth.service.ts: generic message, no
// hint about whether the email exists anywhere in the system.
class NotAuthorizedException extends ForbiddenException {
  constructor() {
    super({
      code: 'NOT_AUTHORIZED',
      message: 'This Google account is not authorized for the superadmin dashboard.',
    });
  }
}

@Injectable()
export class SuperAdminAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly googleVerifier: FirebaseVerifierService,
  ) {}

  async googleLogin(input: GoogleLoginDto) {
    const { email } = await this.googleVerifier.verify(input.idToken);

    const superAdmin = await this.prisma.superAdmin.findUnique({
      where: { email },
    });
    // Not found → no session issued, full stop. Whether or not this email
    // exists elsewhere in the system is never revealed.
    if (!superAdmin) {
      throw new NotAuthorizedException();
    }

    if (!superAdmin.acceptedAt) {
      await this.prisma.superAdmin.update({
        where: { id: superAdmin.id },
        data: { acceptedAt: new Date() },
      });
    }

    const token = await this.jwtService.signAsync({
      sub: superAdmin.id,
      email: superAdmin.email,
      kind: 'SUPERADMIN',
    });

    return { token, superAdmin: { id: superAdmin.id, email: superAdmin.email, name: superAdmin.name } };
  }

  async me(session: SuperAdminSessionPayload) {
    const superAdmin = await this.prisma.superAdmin.findUnique({
      where: { id: session.sub },
    });
    if (!superAdmin) {
      throw new NotAuthorizedException();
    }
    return { id: superAdmin.id, email: superAdmin.email, name: superAdmin.name };
  }
}
