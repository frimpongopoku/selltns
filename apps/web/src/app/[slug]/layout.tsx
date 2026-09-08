import { notFound } from "next/navigation";
import type { Metadata } from "next";
import * as Sentry from "@sentry/nextjs";
import { getAffiliatePublicSummary, getCollections, getStoryBlocks, getTenantBySlug } from "@/lib/api";
import { hasStoryContent } from "@/lib/story";
import { isCustomDomainRequest } from "@/lib/request-host";
import { obscurePhone } from "@/lib/phone";
import { ThemeScope } from "@/components/theme/theme-scope";
import { StoreProvider } from "@/components/storefront/store-context";
import { CartProvider } from "@/components/storefront/cart-provider";
import { SiteHeader } from "@/components/storefront/site-header";
import { SiteFooter } from "@/components/storefront/site-footer";
import { SentryUserContext } from "@/components/sentry-context";
import { PostHogIdentify } from "@/components/analytics/posthog-identify";
import { SuspendedStoreNotice } from "@/components/storefront/suspended-store-notice";

// Only set when the tenant has a logo — otherwise leave `icons` unset so
// the platform's default favicon (app/icon.tsx) keeps applying, same as
// before this existed.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const tenant = await getTenantBySlug(slug).catch(() => null);
  if (!tenant?.logoUrl) return {};
  return { icons: { icon: `/api/favicon?slug=${slug}` } };
}

export default async function StorefrontLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const tenant = await getTenantBySlug(slug).catch(() => null);
  if (!tenant) notFound();
  if (tenant.suspended) return <SuspendedStoreNotice tenant={tenant} />;
  const [storyBlocks, collections, isCustomDomain, affiliateSummary] = await Promise.all([
    getStoryBlocks(tenant.id).catch(() => []),
    getCollections(tenant.id).catch(() => []),
    isCustomDomainRequest(),
    getAffiliatePublicSummary(tenant.id).catch(() => ({ sellsFor: [], resoldBy: [] })),
  ]);
  const hasStory = hasStoryContent(storyBlocks);
  const hasCollections = collections.some((c) => c.isActive);
  Sentry.setTag("tenant", slug);

  // SiteHeader/SiteFooter are Client Components rendered on every storefront
  // page — neither needs the vendor's phone number or contact email, so
  // both are stripped before the tenant object is handed to them. Otherwise
  // they'd be serialized into the RSC payload of every single page under
  // this layout, not just the ones that actually display them. The footer's
  // contact section gets pre-obscured tokens instead (see lib/phone.ts) —
  // decoded client-side only, after mount, so a bot fetching the page
  // source never sees the raw number or email.
  const publicTenant = { ...tenant, whatsappNumber: null, contactEmail: null };
  const whatsappNumberEncoded = tenant.whatsappNumber
    ? obscurePhone(tenant.whatsappNumber)
    : null;
  const contactEmailEncoded = tenant.contactEmail
    ? obscurePhone(tenant.contactEmail)
    : null;

  return (
    <StoreProvider slug={slug} isCustomDomain={isCustomDomain}>
      <ThemeScope tokens={tenant.themeTokens} className="flex min-h-full flex-col">
        <CartProvider>
          <SentryUserContext tenantId={tenant.id} tenantSlug={slug} />
          <PostHogIdentify tenantId={tenant.id} tenantSlug={slug} />
          <SiteHeader tenant={publicTenant} hasStory={hasStory} hasCollections={hasCollections} />
          <main className="flex-1">{children}</main>
          <SiteFooter
            tenant={publicTenant}
            hasStory={hasStory}
            hasCollections={hasCollections}
            affiliateSummary={affiliateSummary}
            contactSectionVisible={tenant.contactSectionVisible}
            whatsappNumberEncoded={whatsappNumberEncoded}
            contactEmailEncoded={contactEmailEncoded}
          />
        </CartProvider>
      </ThemeScope>
    </StoreProvider>
  );
}
