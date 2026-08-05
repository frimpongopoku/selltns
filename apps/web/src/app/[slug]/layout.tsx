import { notFound } from "next/navigation";
import { getTenantBySlug } from "@/lib/api";
import { ThemeScope } from "@/components/theme/theme-scope";
import { StoreProvider } from "@/components/storefront/store-context";
import { CartProvider } from "@/components/storefront/cart-provider";
import { SiteHeader } from "@/components/storefront/site-header";
import { SiteFooter } from "@/components/storefront/site-footer";

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

  return (
    <StoreProvider slug={slug}>
      <ThemeScope tokens={tenant.themeTokens} className="flex min-h-full flex-col">
        <CartProvider>
          <SiteHeader tenant={tenant} />
          <main className="flex-1">{children}</main>
          <SiteFooter tenant={tenant} />
        </CartProvider>
      </ThemeScope>
    </StoreProvider>
  );
}
