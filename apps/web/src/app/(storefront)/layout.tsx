import { getTenant } from "@/lib/api";
import { ThemeScope } from "@/components/theme/theme-scope";
import { CartProvider } from "@/components/storefront/cart-provider";
import { SiteHeader } from "@/components/storefront/site-header";
import { SiteFooter } from "@/components/storefront/site-footer";

export default async function StorefrontLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const tenant = await getTenant();

  return (
    <ThemeScope tokens={tenant.themeTokens} className="flex min-h-full flex-col">
      <CartProvider>
        <SiteHeader tenant={tenant} />
        <main className="flex-1">{children}</main>
        <SiteFooter tenant={tenant} />
      </CartProvider>
    </ThemeScope>
  );
}
