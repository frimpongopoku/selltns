import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getCollection, getTenant } from "@/lib/api";
import { ThemeScope } from "@/components/theme/theme-scope";
import { ProductCard } from "@/components/storefront/product-card";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const collection = await getCollection(slug).catch(() => null);
  if (!collection) return { title: "Collection not found" };
  return {
    title: collection.seoTitle,
    description: collection.seoDescription,
    openGraph: { title: collection.seoTitle, description: collection.seoDescription },
  };
}

export default async function CollectionPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [tenant, collection] = await Promise.all([
    getTenant(),
    getCollection(slug).catch(() => null),
  ]);

  if (!collection) notFound();

  const tokens = collection.themeOverride ?? tenant.themeTokens;

  return (
    <ThemeScope tokens={tokens} className="min-h-0">
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-16 lg:px-8">
        {collection.themeOverride && (
          <p className="store-accent-text mb-3 text-xs font-semibold tracking-wide uppercase">
            Styled with the {collection.themeOverride.template.toLowerCase()} theme
          </p>
        )}
        <h1 className="store-heading text-3xl font-semibold">{collection.title}</h1>
        <p className="store-muted mt-3 max-w-lg leading-relaxed">{collection.description}</p>
        <div className="mt-9 grid grid-cols-3 gap-3 sm:gap-5 lg:grid-cols-4">
          {collection.products.map((product, i) => (
            <div
              key={product.id}
              style={{ animationDelay: `${Math.min(i, 8) * 50}ms` }}
              className="h-full animate-in fade-in-0 slide-in-from-bottom-2 fill-mode-both duration-500"
            >
              <ProductCard product={product} />
            </div>
          ))}
        </div>
        {collection.products.length === 0 && (
          <p className="store-muted mt-8">No products in this collection yet.</p>
        )}
      </div>
    </ThemeScope>
  );
}
