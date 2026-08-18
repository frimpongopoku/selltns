import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RESERVED_SLUGS } from '../common/reserved-slugs';
import type { Tenant, ThemeTokens } from '../common/types';
import { DOMAIN_PROVIDER } from '../domains/domain-provider';
import type { DomainProvider, DomainStatus } from '../domains/domain-provider';

const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const DOMAIN_PATTERN = /^([a-z0-9]([a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/;

export interface SlugAvailability {
  available: boolean;
  reason?: 'invalid' | 'reserved' | 'taken';
}

export interface CustomDomainInfo extends DomainStatus {
  domain: string | null;
}

@Injectable()
export class TenantsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(DOMAIN_PROVIDER) private readonly domainProvider: DomainProvider,
  ) {}

  async findBySlug(slug: string): Promise<Tenant> {
    const tenant = await this.prisma.tenant.findUnique({ where: { slug } });
    if (!tenant) throw new NotFoundException(`Store "${slug}" not found`);
    return tenant as unknown as Tenant;
  }

  async checkSlugAvailability(slug: string): Promise<SlugAvailability> {
    if (slug.length < 3 || slug.length > 63 || !SLUG_PATTERN.test(slug)) {
      return { available: false, reason: 'invalid' };
    }
    if (RESERVED_SLUGS.has(slug)) {
      return { available: false, reason: 'reserved' };
    }
    const existing = await this.prisma.tenant.findUnique({ where: { slug } });
    return existing
      ? { available: false, reason: 'taken' }
      : { available: true };
  }

  async updateTheme(
    tenantId: string,
    themeTokens: ThemeTokens,
  ): Promise<Tenant> {
    const tenant = await this.prisma.tenant
      .update({
        where: { id: tenantId },
        data: { themeTokens: themeTokens as object },
      })
      .catch(() => {
        throw new NotFoundException(`Tenant ${tenantId} not found`);
      });
    return tenant as unknown as Tenant;
  }

  async updateProfile(
    tenantId: string,
    input: { whatsappNumber?: string | null; logoUrl?: string | null },
  ): Promise<Tenant> {
    const tenant = await this.prisma.tenant
      .update({
        where: { id: tenantId },
        data: {
          whatsappNumber: input.whatsappNumber,
          logoUrl: input.logoUrl,
        },
      })
      .catch(() => {
        throw new NotFoundException(`Tenant ${tenantId} not found`);
      });
    return tenant as unknown as Tenant;
  }

  async updateOwnershipInfo(
    tenantId: string,
    input: {
      ownerDisplayName?: string;
      ownerTitle?: string;
      ownerBio?: string;
      ownerInfoVisible?: boolean;
    },
  ): Promise<Tenant> {
    const tenant = await this.prisma.tenant
      .update({
        where: { id: tenantId },
        data: input,
      })
      .catch(() => {
        throw new NotFoundException(`Tenant ${tenantId} not found`);
      });
    return tenant as unknown as Tenant;
  }

  async updateStorefrontCopy(
    tenantId: string,
    input: { heroTagline?: string; footerTagline?: string },
  ): Promise<Tenant> {
    const tenant = await this.prisma.tenant
      .update({
        where: { id: tenantId },
        data: input,
      })
      .catch(() => {
        throw new NotFoundException(`Tenant ${tenantId} not found`);
      });
    return tenant as unknown as Tenant;
  }

  async getDomainStatus(tenantId: string): Promise<CustomDomainInfo> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });
    if (!tenant) throw new NotFoundException(`Tenant ${tenantId} not found`);
    if (!tenant.customDomain) {
      return { domain: null, verified: false, instructions: [] };
    }
    const status = await this.domainProvider.getStatus(tenant.customDomain);
    if (status.verified !== tenant.domainVerified) {
      await this.prisma.tenant.update({
        where: { id: tenantId },
        data: { domainVerified: status.verified },
      });
    }
    return { domain: tenant.customDomain, ...status };
  }

  async setDomain(
    tenantId: string,
    rawDomain: string,
  ): Promise<CustomDomainInfo> {
    const domain = rawDomain.trim().toLowerCase();
    if (!DOMAIN_PATTERN.test(domain)) {
      throw new ConflictException(
        "That doesn't look like a valid domain (e.g. myshop.com).",
      );
    }
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });
    if (!tenant) throw new NotFoundException(`Tenant ${tenantId} not found`);
    if (tenant.customDomain === domain) {
      return this.getDomainStatus(tenantId);
    }
    const existing = await this.prisma.tenant.findFirst({
      where: { customDomain: domain, id: { not: tenantId } },
    });
    if (existing) {
      throw new ConflictException(
        'That domain is already connected to another store.',
      );
    }
    // Switching domains, not just adding one for the first time — release
    // the old one from the provider first so nothing stays half-registered
    // (e.g. still claimed on the Vercel project) once it's replaced.
    if (tenant.customDomain) {
      await this.domainProvider.removeDomain(tenant.customDomain);
    }
    const status = await this.domainProvider.addDomain(domain);
    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: { customDomain: domain, domainVerified: status.verified },
    });
    return { domain, ...status };
  }

  async removeDomain(tenantId: string): Promise<void> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });
    if (!tenant) throw new NotFoundException(`Tenant ${tenantId} not found`);
    if (tenant.customDomain) {
      await this.domainProvider.removeDomain(tenant.customDomain);
    }
    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: { customDomain: null, domainVerified: false },
    });
  }

  // Public, unauthenticated — feeds the platform's sitemap.ts. Excludes
  // tenants on a verified custom domain: their canonical home is now that
  // domain, which generates its own scoped sitemap, so listing them here
  // too would just be duplicate/non-canonical content.
  async listPublicDirectory(): Promise<Tenant[]> {
    const tenants = await this.prisma.tenant.findMany({
      where: { NOT: { AND: [{ customDomain: { not: null } }, { domainVerified: true }] } },
    });
    return tenants as unknown as Tenant[];
  }

  async findByCustomDomain(host: string): Promise<{ slug: string }> {
    const tenant = await this.prisma.tenant.findFirst({
      where: { customDomain: host.toLowerCase(), domainVerified: true },
      select: { slug: true },
    });
    if (!tenant)
      throw new NotFoundException(`No verified store for host "${host}"`);
    return tenant;
  }
}
