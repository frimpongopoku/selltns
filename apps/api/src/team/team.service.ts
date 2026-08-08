import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EMAIL_SERVICE, type EmailService } from '../email/email.service';
import { teamInviteEmail } from '../email/templates';
import type { Role, TeamMember, Tenant } from '../common/types';

interface MembershipRow {
  id: string;
  tenantId: string;
  role: Role;
  invitedAt: Date;
  acceptedAt: Date | null;
  user: { name: string; email: string };
}

function mapMember(row: MembershipRow): TeamMember {
  return {
    id: row.id,
    tenantId: row.tenantId,
    name: row.user.name,
    email: row.user.email,
    role: row.role,
    invitedAt: row.invitedAt.toISOString(),
    acceptedAt: row.acceptedAt?.toISOString() ?? null,
  };
}

@Injectable()
export class TeamService {
  private readonly logger = new Logger(TeamService.name);
  private readonly webOrigin = process.env.WEB_ORIGIN ?? 'http://localhost:4310';

  constructor(
    private readonly prisma: PrismaService,
    @Inject(EMAIL_SERVICE) private readonly emailService: EmailService,
  ) {}

  async findAll(tenantId: string): Promise<TeamMember[]> {
    const rows = await this.prisma.tenantMembership.findMany({
      where: { tenantId },
      include: { user: true },
      orderBy: { invitedAt: 'asc' },
    });
    return rows.map(mapMember);
  }

  // Invites work by allowlist, not a click-through link: this creates (or
  // reuses) a User row for the email and a pending TenantMembership, and
  // the invite is accepted the moment that person signs in with Google
  // using this exact email — see AuthService.activateMembership.
  async invite(
    tenantId: string,
    input: { name: string; email: string; role: Role },
  ): Promise<TeamMember> {
    const email = input.email.trim().toLowerCase();
    if (!email) {
      throw new BadRequestException('Email is required');
    }
    if (input.role === 'OWNER') {
      throw new BadRequestException('There can only be one owner.');
    }
    const name = input.name.trim() || email;

    const existingMembership = await this.prisma.tenantMembership.findFirst({
      where: { tenantId, user: { email } },
    });
    if (existingMembership) {
      throw new BadRequestException('That person is already on this team.');
    }

    const user = await this.prisma.user.upsert({
      where: { email },
      update: {},
      create: { email, name },
    });

    const membership = await this.prisma.tenantMembership.create({
      data: { tenantId, userId: user.id, role: input.role },
      include: { user: true },
    });

    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (tenant) {
      const loginUrl = `${this.webOrigin}/admin/login`;
      this.emailService
        .send({
          to: email,
          ...teamInviteEmail(
            { name, email, role: input.role },
            tenant as unknown as Tenant,
            loginUrl,
          ),
        })
        .catch((err) => {
          // The membership already exists — a failed invite email
          // shouldn't undo it, just get logged for follow-up.
          this.logger.error(`Failed to send invite email to ${email}: ${err}`);
        });
    }

    return mapMember(membership);
  }

  async remove(id: string, tenantId: string): Promise<{ id: string }> {
    const membership = await this.prisma.tenantMembership.findFirst({
      where: { id, tenantId },
    });
    if (!membership) {
      throw new NotFoundException(`Membership ${id} not found`);
    }
    if (membership.role === 'OWNER') {
      throw new ForbiddenException('The owner cannot be removed.');
    }
    await this.prisma.tenantMembership.delete({ where: { id: membership.id } });
    return { id: membership.id };
  }
}
