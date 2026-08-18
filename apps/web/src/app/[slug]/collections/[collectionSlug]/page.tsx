import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getCollection, getTenantBySlug } from "@/lib/api";
import { ThemeScope } from "@/components/theme/theme-scope";
import { ProductCard } from "@/components/storefront/product-card";
import { PreorderBanner } from "@/components/storefront/preorder-banner";
import { getCanonicalUrl } from "@/lib/canonical";
import { collectionJsonLd, jsonLdScriptProps } from "@/lib/structured-data";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; collectionSlug: string }>;
}): Promise<Metadata> {
  const { slug, collectionSlug } = await params;
  const tenant = await getTenantBySlug(slug).catch(() => null);
  if (!tenant) return { title: "Store not found" };
  const collection = await getCollection(collectionSlug, tenant.id).catch(() => null);
  if (!collection) return { title: "Collection not found" };
  const title = collection.seoTitle || `${collection.title} — ${tenant.name}`;
  const description =
    collection.seoDescription ||
    collection.description ||
    tenant.heroTagline ||
    tenant.footerTagline ||
    `Browse ${collection.title} from ${tenant.name} on Selltns.`;
  const canonical = getCanonicalUrl(tenant, `/collections/${collection.slug}`);
  // Prefer the collection's own cover photo; fall back to any active
  // product's photo before giving up and letting opengraph-image.tsx
  // render a typographic fallback. Point og:image straight at that URL
  // rather than compositing it through next/og — real social crawlers
  // decode it (WebP included) fine on their own; that limitation is
  // specific to our own Satori-based renderer, not to how they fetch an
  // og:image directly.
  const image =
    collection.coverImage || collection.products.find((p) => p.isActive && p.images[0])?.images[0];
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      type: "website",
      siteName: tenant.name,
      images: image ? [{ url: image }] : undefined,
    },
  };
}

export default async function CollectionPage({
  params,
}: {
  params: Promise<{ slug: string; collectionSlug: string }>;
}) {
  const { slug, collectionSlug } = await params;
  const tenant = await getTenantBySlug(slug).catch(() => null);
  if (!tenant) notFound();
  const collection = await getCollection(collectionSlug, tenant.id).catch(() => null);
  if (!collection) notFound();

  const tokens = collection.themeOverride ?? tenant.themeTokens;
  const activeProducts = collection.products.filter((p) => p.isActive);

  return (
    <ThemeScope tokens={tokens} className="min-h-0">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLdScriptProps(collectionJsonLd(tenant, collection))}
      />
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-16 lg:px-8">
        {collection.themeOverride && (
          <p className="store-accent-text mb-3 text-xs font-semibold tracking-wide uppercase">
            Styled with the {collection.themeOverride.template.toLowerCase()} theme
          </p>
        )}
        <h1 className="store-heading text-3xl font-semibold">{collection.title}</h1>
        <p className="store-muted mt-3 max-w-lg leading-relaxed">{collection.description}</p>
        <PreorderBanner collection={collection} />
        <div className="mt-9 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4">
          {activeProducts.map((product, i) => (
            <div
              key={product.id}
              style={{ animationDelay: `${Math.min(i, 8) * 50}ms` }}
              className="h-full animate-in fade-in-0 slide-in-from-bottom-2 fill-mode-both duration-500"
            >
              <ProductCard product={product} />
            </div>
          ))}
        </div>
        {activeProducts.length === 0 && (
          <p className="store-muted mt-8">No products in this collection yet.</p>
        )}
      </div>
    </ThemeScope>
  );
}
