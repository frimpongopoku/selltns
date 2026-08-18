import { notFound } from "next/navigation";
import * as Sentry from "@sentry/nextjs";
import { getCollections, getStoryBlocks, getTenantBySlug } from "@/lib/api";
import { hasStoryContent } from "@/lib/story";
import { isCustomDomainRequest } from "@/lib/request-host";
import { ThemeScope } from "@/components/theme/theme-scope";
import { StoreProvider } from "@/components/storefront/store-context";
import { CartProvider } from "@/components/storefront/cart-provider";
import { SiteHeader } from "@/components/storefront/site-header";
import { SiteFooter } from "@/components/storefront/site-footer";
import { SentryUserContext } from "@/components/sentry-context";
import { PostHogIdentify } from "@/components/analytics/posthog-identify";
import { SuspendedStoreNotice } from "@/components/storefront/suspended-store-notice";

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
  const [storyBlocks, collections, isCustomDomain] = await Promise.all([
    getStoryBlocks(tenant.id).catch(() => []),
    getCollections(tenant.id).catch(() => []),
    isCustomDomainRequest(),
  ]);
  const hasStory = hasStoryContent(storyBlocks);
  const hasCollections = collections.some((c) => c.isActive);
  Sentry.setTag("tenant", slug);

  // SiteHeader/SiteFooter are Client Components rendered on every storefront
  // page — neither needs the vendor's phone number, so it's stripped before
  // the tenant object is handed to them. Otherwise it would be serialized
  // into the RSC payload of every single page under this layout, not just
  // the ones that actually display it.
  const publicTenant = { ...tenant, whatsappNumber: null };

  return (
    <StoreProvider slug={slug} isCustomDomain={isCustomDomain}>
      <ThemeScope tokens={tenant.themeTokens} className="flex min-h-full flex-col">
        <CartProvider>
          <SentryUserContext tenantId={tenant.id} tenantSlug={slug} />
          <PostHogIdentify tenantId={tenant.id} tenantSlug={slug} />
          <SiteHeader tenant={publicTenant} hasStory={hasStory} hasCollections={hasCollections} />
          <main className="flex-1">{children}</main>
          <SiteFooter tenant={publicTenant} hasStory={hasStory} hasCollections={hasCollections} />
        </CartProvider>
      </ThemeScope>
    </StoreProvider>
  );
}
