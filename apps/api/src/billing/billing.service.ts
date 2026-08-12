import {
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { PlanTier, UpgradeRequestStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EMAIL_SERVICE, type EmailService } from '../email/email.service';
import {
  upgradeApprovedEmail,
  upgradeRejectedEmail,
  upgradeRequestReceivedEmail,
} from '../email/templates';
import type { Tenant } from '../common/types';

type PlatformPaymentMethodType = 'MOMO' | 'BANK';

const BILLING_SETTINGS_ID = 'singleton';

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);
  private readonly webOrigin =
    process.env.WEB_ORIGIN ?? 'http://localhost:4310';

  constructor(
    private readonly prisma: PrismaService,
    @Inject(EMAIL_SERVICE) private readonly emailService: EmailService,
  ) {}

  // --- Platform payment methods (Selltns' own MoMo/bank, shown to vendors) -

  listPlatformPaymentMethods(onlyEnabled: boolean) {
    return this.prisma.platformPaymentMethod.findMany({
      where: onlyEnabled ? { isEnabled: true } : undefined,
      orderBy: { createdAt: 'asc' },
    });
  }

  createPlatformPaymentMethod(input: {
    type: PlatformPaymentMethodType;
    label: string;
    details: Record<string, string>;
    isEnabled?: boolean;
  }) {
    return this.prisma.platformPaymentMethod.create({
      data: {
        type: input.type,
        label: input.label,
        details: input.details,
        isEnabled: input.isEnabled ?? true,
      },
    });
  }

  async updatePlatformPaymentMethod(
    id: string,
    input: Partial<{
      type: PlatformPaymentMethodType;
      label: string;
      details: Record<string, string>;
      isEnabled: boolean;
      isPreferred: boolean;
    }>,
  ) {
    const existing = await this.prisma.platformPaymentMethod.findUnique({
      where: { id },
    });
    if (!existing)
      throw new NotFoundException(`Payment method ${id} not found`);

    return this.prisma.$transaction(async (tx) => {
      if (input.isPreferred) {
        await tx.platformPaymentMethod.updateMany({
          where: { id: { not: id } },
          data: { isPreferred: false },
        });
      }
      return tx.platformPaymentMethod.update({
        where: { id },
        data: {
          type: input.type ?? existing.type,
          label: input.label ?? existing.label,
          details:
            input.details !== undefined
              ? (input.details as Prisma.InputJsonValue)
              : (existing.details as Prisma.InputJsonValue),
          isEnabled: input.isEnabled ?? existing.isEnabled,
          isPreferred: input.isPreferred ?? existing.isPreferred,
        },
      });
    });
  }

  async removePlatformPaymentMethod(id: string) {
    const existing = await this.prisma.platformPaymentMethod.findUnique({
      where: { id },
    });
    if (!existing)
      throw new NotFoundException(`Payment method ${id} not found`);
    await this.prisma.platformPaymentMethod.delete({ where: { id } });
    return { id };
  }

  // --- Billing instructions message ----------------------------------------

  async getBillingMessage(): Promise<{ message: string }> {
    const row = await this.prisma.platformBillingSettings.upsert({
      where: { id: BILLING_SETTINGS_ID },
      create: { id: BILLING_SETTINGS_ID },
      update: {},
    });
    return { message: row.message };
  }

  async setBillingMessage(message: string): Promise<{ message: string }> {
    const row = await this.prisma.platformBillingSettings.upsert({
      where: { id: BILLING_SETTINGS_ID },
      create: { id: BILLING_SETTINGS_ID, message },
      update: { message },
    });
    return { message: row.message };
  }

  // --- Upgrade requests ------------------------------------------------------

  async submitUpgradeRequest(
    tenantId: string,
    requestedPlan: PlanTier,
    referenceNote: string,
  ) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });
    if (!tenant) throw new NotFoundException(`Store ${tenantId} not found`);

    const pending = await this.prisma.upgradeRequest.findFirst({
      where: { tenantId, status: 'PENDING' },
    });
    if (pending) {
      throw new ConflictException(
        'You already have a pending upgrade request — wait for it to be reviewed before submitting another.',
      );
    }

    const request = await this.prisma.upgradeRequest.create({
      data: { tenantId, requestedPlan, referenceNote },
    });

    const billingUrl = `${this.webOrigin}/admin/upgrade`;
    void this.sendIfOwner(
      tenantId,
      () =>
        upgradeRequestReceivedEmail(
          tenant as unknown as Tenant,
          requestedPlan,
          billingUrl,
        ),
      'upgrade-request-received',
    );

    return request;
  }

  listOwnUpgradeRequests(tenantId: string) {
    return this.prisma.upgradeRequest.findMany({
      where: { tenantId },
      orderBy: { submittedAt: 'desc' },
    });
  }

  listUpgradeRequests(status?: UpgradeRequestStatus) {
    return this.prisma.upgradeRequest.findMany({
      where: status ? { status } : undefined,
      include: { tenant: { select: { name: true, slug: true, plan: true } } },
      orderBy: { submittedAt: 'desc' },
    });
  }

  async getUpgradeRequest(id: string) {
    const request = await this.prisma.upgradeRequest.findUnique({
      where: { id },
      include: {
        tenant: { select: { id: true, name: true, slug: true, plan: true } },
      },
    });
    if (!request)
      throw new NotFoundException(`Upgrade request ${id} not found`);
    return request;
  }

  async approveUpgradeRequest(id: string, superAdminId: string) {
    const request = await this.prisma.upgradeRequest.findUnique({
      where: { id },
    });
    if (!request)
      throw new NotFoundException(`Upgrade request ${id} not found`);
    if (request.status !== 'PENDING') {
      throw new ConflictException('This request has already been reviewed.');
    }

    const now = new Date();
    const [, tenant] = await this.prisma.$transaction([
      this.prisma.upgradeRequest.update({
        where: { id },
        data: {
          status: 'APPROVED',
          reviewedBySuperAdminId: superAdminId,
          reviewedAt: now,
        },
      }),
      this.prisma.tenant.update({
        where: { id: request.tenantId },
        data: { plan: request.requestedPlan, planUpdatedAt: now },
      }),
    ]);

    const billingUrl = `${this.webOrigin}/admin/upgrade`;
    void this.sendIfOwner(
      request.tenantId,
      () =>
        upgradeApprovedEmail(
          tenant as unknown as Tenant,
          request.requestedPlan,
          billingUrl,
        ),
      'upgrade-approved',
    );

    return { ok: true };
  }

  async rejectUpgradeRequest(id: string, reason: string, superAdminId: string) {
    const request = await this.prisma.upgradeRequest.findUnique({
      where: { id },
    });
    if (!request)
      throw new NotFoundException(`Upgrade request ${id} not found`);
    if (request.status !== 'PENDING') {
      throw new ConflictException('This request has already been reviewed.');
    }

    await this.prisma.upgradeRequest.update({
      where: { id },
      data: {
        status: 'REJECTED',
        rejectionReason: reason,
        reviewedBySuperAdminId: superAdminId,
        reviewedAt: new Date(),
      },
    });

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: request.tenantId },
    });
    if (tenant) {
      const billingUrl = `${this.webOrigin}/admin/upgrade`;
      void this.sendIfOwner(
        request.tenantId,
        () =>
          upgradeRejectedEmail(tenant as unknown as Tenant, reason, billingUrl),
        'upgrade-rejected',
      );
    }

    return { ok: true };
  }

  // A superadmin can set a tenant's plan directly, with no request in the
  // loop at all — the fallback for a purely WhatsApp-and-MoMo arrangement
  // that never went through the self-serve request form.
  async setTenantPlan(tenantId: string, plan: PlanTier) {
    return this.prisma.tenant
      .update({
        where: { id: tenantId },
        data: { plan, planUpdatedAt: new Date() },
      })
      .catch(() => {
        throw new NotFoundException(`Store ${tenantId} not found`);
      });
  }

  private async ownerEmail(tenantId: string): Promise<string | null> {
    const ownerMembership = await this.prisma.tenantMembership.findFirst({
      where: { tenantId, role: 'OWNER' },
      include: { user: { select: { email: true } } },
    });
    return ownerMembership?.user.email ?? null;
  }

  private async sendIfOwner(
    tenantId: string,
    build: () => { subject: string; html: string; text: string },
    label: string,
  ): Promise<void> {
    const to = await this.ownerEmail(tenantId);
    if (!to) return;
    this.emailService.send({ to, ...build() }).catch((err) => {
      this.logger.error(`Failed to send ${label} email: ${err}`);
    });
  }
}
