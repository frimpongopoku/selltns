import {
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EMAIL_SERVICE, type EmailService } from '../email/email.service';
import {
  userVerifiedEmail,
  verificationRejectedEmail,
  superAdminInviteEmail,
} from '../email/templates';
import {
  PRIVATE_STORAGE_SERVICE,
  type PrivateStorageService,
} from '../media/storage/private-storage.service';
import type { Tenant } from '../common/types';
import { DEMO_TENANT_ID } from '../common/seed-data';
import type { VerificationRequestStatus } from '@prisma/client';

@Injectable()
export class SuperAdminService {
  private readonly logger = new Logger(SuperAdminService.name);
  private readonly webOrigin = process.env.WEB_ORIGIN ?? 'http://localhost:4310';

  constructor(
    private readonly prisma: PrismaService,
    @Inject(EMAIL_SERVICE) private readonly emailService: EmailService,
    @Inject(PRIVATE_STORAGE_SERVICE)
    private readonly privateStorage: PrivateStorageService,
  ) {}

  async overview() {
    // The seeded "Akosua & Co." demo tenant (see common/seed-data.ts) is
    // real data in the database — it powers the live "/demo" storefront
    // linked from the landing page — but it's fixture content, not an
    // actual store, so it's excluded here to keep these numbers honest.
    const [tenantCount, orderCount, gmv, pendingVerificationCount, signups] =
      await Promise.all([
        this.prisma.tenant.count({ where: { id: { not: DEMO_TENANT_ID } } }),
        this.prisma.order.count({
          where: { tenantId: { not: DEMO_TENANT_ID } },
        }),
        this.prisma.order.aggregate({
          where: { status: 'COMPLETED', tenantId: { not: DEMO_TENANT_ID } },
          _sum: { total: true },
        }),
        this.prisma.tenant.count({
          where: { verificationStatus: 'PENDING', id: { not: DEMO_TENANT_ID } },
        }),
        this.prisma.$queryRaw<{ day: Date; count: bigint }[]>`
          SELECT date_trunc('day', created_at) AS day, count(*) AS count
          FROM tenants
          WHERE created_at >= NOW() - INTERVAL '30 days'
            AND id != ${DEMO_TENANT_ID}
          GROUP BY day
          ORDER BY day ASC
        `,
      ]);

    return {
      tenantCount,
      orderCount,
      gmv: gmv._sum.total ?? 0,
      pendingVerificationCount,
      signupsByDay: signups.map((row) => ({
        date: row.day.toISOString().slice(0, 10),
        count: Number(row.count),
      })),
    };
  }

  // --- Verifications ---------------------------------------------------

  async listVerifications(status?: VerificationRequestStatus) {
    return this.prisma.verificationRequest.findMany({
      where: status ? { status } : undefined,
      include: { tenant: { select: { name: true, slug: true } } },
      orderBy: { submittedAt: 'desc' },
    });
  }

  async getVerification(id: string) {
    const request = await this.prisma.verificationRequest.findUnique({
      where: { id },
      include: { tenant: { select: { id: true, name: true, slug: true } } },
    });
    if (!request) throw new NotFoundException(`Verification ${id} not found`);

    const ownerMembership = await this.prisma.tenantMembership.findFirst({
      where: { tenantId: request.tenantId, role: 'OWNER' },
      include: { user: { select: { email: true, name: true } } },
    });

    return { ...request, ownerEmail: ownerMembership?.user.email ?? null };
  }

  async getVerificationPhoto(
    id: string,
    kind: 'id' | 'selfie',
  ): Promise<{ buffer: Buffer; contentType: string }> {
    const request = await this.prisma.verificationRequest.findUnique({
      where: { id },
    });
    if (!request) throw new NotFoundException(`Verification ${id} not found`);

    const key = kind === 'id' ? request.idPhotoKey : request.selfiePhotoKey;
    if (!key) throw new NotFoundException('No photo of that kind on file');

    return this.privateStorage.getObject(key);
  }

  async approveVerification(id: string, superAdminId: string) {
    const request = await this.prisma.verificationRequest.findUnique({
      where: { id },
    });
    if (!request) throw new NotFoundException(`Verification ${id} not found`);
    if (request.status !== 'PENDING') {
      throw new ConflictException('This application has already been reviewed.');
    }

    const ownerMembership = await this.prisma.tenantMembership.findFirst({
      where: { tenantId: request.tenantId, role: 'OWNER' },
    });
    if (!ownerMembership) {
      throw new NotFoundException('This shop has no owner to verify.');
    }

    await this.prisma.verificationRequest.update({
      where: { id },
      data: {
        status: 'APPROVED',
        reviewedBySuperAdminId: superAdminId,
        reviewedAt: new Date(),
      },
    });
    // Verification belongs to the person, not just the shop they applied
    // from — this cascades onto every shop they own.
    await this.verifyUser(ownerMembership.userId);
    return { ok: true };
  }

  // --- Users ---------------------------------------------------------------

  async getTenantDetail(id: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id } });
    if (!tenant) throw new NotFoundException(`Store ${id} not found`);

    const ownerMembership = await this.prisma.tenantMembership.findFirst({
      where: { tenantId: id, role: 'OWNER' },
      include: { user: true },
    });

    return {
      ...tenant,
      owner: ownerMembership
        ? {
            id: ownerMembership.user.id,
            name: ownerMembership.user.name,
            email: ownerMembership.user.email,
            verified: ownerMembership.user.verified,
          }
        : null,
    };
  }

  async verifyUserById(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException(`User ${userId} not found`);
    await this.verifyUser(userId);
    return { ok: true };
  }

  async unverifyUserById(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException(`User ${userId} not found`);
    await this.unverifyUser(userId);
    return { ok: true };
  }

  // Marks a person verified and cascades that onto every shop they OWN —
  // Tenant.verificationStatus stays the fast, denormalized field every
  // storefront/badge read already relies on, this is just what keeps it in
  // sync with the person behind the shop. Shared by the request-approval
  // flow above and the direct "verify this owner" action from a shop's
  // detail page.
  private async verifyUser(userId: string) {
    const ownedMemberships = await this.prisma.tenantMembership.findMany({
      where: { userId, role: 'OWNER' },
      include: { tenant: { select: { id: true, name: true } } },
    });

    const now = new Date();
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { verified: true, verifiedAt: now },
      }),
      ...ownedMemberships.map((m) =>
        this.prisma.tenant.update({
          where: { id: m.tenantId },
          data: { verificationStatus: 'VERIFIED', verifiedAt: now },
        }),
      ),
    ]);

    if (ownedMemberships.length === 0) return;
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) return;
    this.emailService
      .send({
        to: user.email,
        ...userVerifiedEmail(ownedMemberships.map((m) => m.tenant.name)),
      })
      .catch((err) => {
        this.logger.error(`Failed to send verified email to ${user.email}: ${err}`);
      });
  }

  private async unverifyUser(userId: string) {
    const ownedMemberships = await this.prisma.tenantMembership.findMany({
      where: { userId, role: 'OWNER' },
    });

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { verified: false, verifiedAt: null },
      }),
      ...ownedMemberships.map((m) =>
        this.prisma.tenant.update({
          where: { id: m.tenantId },
          data: { verificationStatus: 'NONE', verifiedAt: null },
        }),
      ),
    ]);
  }

  async rejectVerification(id: string, reason: string, superAdminId: string) {
    const request = await this.prisma.verificationRequest.findUnique({
      where: { id },
    });
    if (!request) throw new NotFoundException(`Verification ${id} not found`);
    if (request.status !== 'PENDING') {
      throw new ConflictException('This application has already been reviewed.');
    }

    const [, tenant] = await this.prisma.$transaction([
      this.prisma.verificationRequest.update({
        where: { id },
        data: {
          status: 'REJECTED',
          rejectionReason: reason,
          reviewedBySuperAdminId: superAdminId,
          reviewedAt: new Date(),
        },
      }),
      this.prisma.tenant.update({
        where: { id: request.tenantId },
        data: { verificationStatus: 'REJECTED' },
      }),
    ]);

    this.notifyOwner(tenant as unknown as Tenant, (t) => verificationRejectedEmail(t, reason));
    return { ok: true };
  }

  private async notifyOwner(
    tenant: Tenant,
    buildEmail: (tenant: Tenant) => { subject: string; html: string; text: string },
  ) {
    const ownerMembership = await this.prisma.tenantMembership.findFirst({
      where: { tenantId: tenant.id, role: 'OWNER' },
      include: { user: { select: { email: true } } },
    });
    if (!ownerMembership) return;

    this.emailService
      .send({ to: ownerMembership.user.email, ...buildEmail(tenant) })
      .catch((err) => {
        this.logger.error(
          `Failed to send verification-status email to ${ownerMembership.user.email}: ${err}`,
        );
      });
  }

  // --- Tenants -----------------------------------------------------------

  async listTenants(q?: string, cursor?: string) {
    const where = {
      id: { not: DEMO_TENANT_ID },
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: 'insensitive' as const } },
              { slug: { contains: q, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };

    return this.prisma.tenant.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });
  }

  async suspendTenant(id: string, reason: string) {
    return this.prisma.tenant
      .update({
        where: { id },
        data: { suspended: true, suspendedAt: new Date(), suspendedReason: reason },
      })
      .catch(() => {
        throw new NotFoundException(`Store ${id} not found`);
      });
  }

  async unsuspendTenant(id: string) {
    return this.prisma.tenant
      .update({
        where: { id },
        data: { suspended: false, suspendedAt: null, suspendedReason: null },
      })
      .catch(() => {
        throw new NotFoundException(`Store ${id} not found`);
      });
  }

  // --- Superadmins ---------------------------------------------------------

  async listAdmins() {
    return this.prisma.superAdmin.findMany({ orderBy: { invitedAt: 'asc' } });
  }

  async inviteAdmin(email?: string) {
    const normalized = email?.trim().toLowerCase();
    if (!normalized) throw new ConflictException('An email is required.');

    const existing = await this.prisma.superAdmin.findUnique({
      where: { email: normalized },
    });
    if (existing) {
      throw new ConflictException('That email is already a superadmin.');
    }

    const admin = await this.prisma.superAdmin.create({
      data: { email: normalized },
    });

    const loginUrl = `${this.webOrigin}/superadmin/login`;
    this.emailService
      .send({ to: normalized, ...superAdminInviteEmail(normalized, loginUrl) })
      .catch((err) => {
        this.logger.error(`Failed to send superadmin invite to ${normalized}: ${err}`);
      });

    return admin;
  }
}
