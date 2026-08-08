import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getCollections, getProducts, getTenantBySlug } from "@/lib/api";
import { ProductCard } from "@/components/storefront/product-card";
import { getCanonicalUrl } from "@/lib/canonical";
import { jsonLdScriptProps, storeJsonLd } from "@/lib/structured-data";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const tenant = await getTenantBySlug(slug).catch(() => null);
  if (!tenant) return { title: "Store not found" };
  const description = `Small-batch, handmade pieces from ${tenant.name}. Request your favorites and we'll confirm before arranging payment.`;
  const canonical = getCanonicalUrl(tenant);
  return {
    title: tenant.name,
    description,
    alternates: { canonical },
    openGraph: { title: tenant.name, description, url: canonical, type: "website" },
  };
}

export default async function StoreHomePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const tenant = await getTenantBySlug(slug).catch(() => null);
  if (!tenant) notFound();

  const [products, collections] = await Promise.all([
    getProducts(tenant.id),
    getCollections(tenant.id),
  ]);
  const activeProducts = products.filter((p) => p.isActive);
  const activeCollections = collections.filter((c) => c.isActive);

  return (
    <div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLdScriptProps(storeJsonLd(tenant))}
      />
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
        <div className="animate-in fade-in-0 slide-in-from-bottom-2 duration-500">
          <p className="store-nav-link store-accent-text text-sm font-semibold">
            Welcome to
          </p>
          <h1 className="store-heading mt-3 max-w-2xl text-4xl leading-tight sm:text-6xl">
            {tenant.name}
          </h1>
          <p className="store-muted mt-5 max-w-lg text-base leading-relaxed sm:text-lg">
            Small-batch, handmade pieces. Request your favorites and
            we&apos;ll confirm before arranging payment.
          </p>
          <Link
            href="#products"
            className="store-btn-primary mt-9 inline-block px-7 py-3.5 text-sm font-medium"
          >
            Shop the collection
          </Link>
        </div>
      </section>

      {activeCollections.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6 lg:px-8">
          <h2 className="store-heading text-2xl font-semibold">Collections</h2>
          <div className="mt-7 grid grid-cols-1 gap-5 sm:grid-cols-3">
            {activeCollections.map((collection, i) => (
              <Link
                key={collection.id}
                href={`/${slug}/collections/${collection.slug}`}
                style={{ animationDelay: `${i * 60}ms` }}
                className="store-card group relative block aspect-[16/10] animate-in fade-in-0 slide-in-from-bottom-2 overflow-hidden fill-mode-both duration-500"
              >
                <div
                  className="absolute inset-0 bg-cover bg-top transition-transform duration-300 group-hover:scale-105"
                  style={{ backgroundImage: `url(${collection.coverImage})` }}
                />
                <div className="absolute inset-0 bg-black/35 transition-colors group-hover:bg-black/50" />
                <div className="absolute bottom-0 left-0 p-5">
                  {collection.type === "PREORDER" && (
                    <span className="mb-2 inline-flex items-center gap-1 rounded-full bg-amber-500/90 px-2.5 py-1 text-xs font-medium text-white">
                      Pre-order
                    </span>
                  )}
                  <p className="store-heading text-lg text-white">
                    {collection.title}
                  </p>
                  <p className="text-xs text-white/80">
                    {collection.products.filter((p) => p.isActive).length} piece
                    {collection.products.filter((p) => p.isActive).length === 1 ? "" : "s"}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section id="products" className="mx-auto max-w-6xl px-4 pb-28 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          <h2 className="store-heading text-2xl font-semibold">All products</h2>
          <span className="store-muted text-sm">{activeProducts.length} items</span>
        </div>
        {activeProducts.length === 0 ? (
          <p className="store-muted mt-8">No products yet. Check back soon.</p>
        ) : (
          <div className="mt-7 grid grid-cols-3 gap-3 sm:gap-5 lg:grid-cols-4">
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
        )}
      </section>
    </div>
  );
}
