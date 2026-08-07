import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getCollections, getProduct, getProducts, getTenantBySlug } from "@/lib/api";
import { formatMoney } from "@/lib/format";
import { AddToCartButton } from "@/components/storefront/add-to-cart-button";
import { ProductGallery } from "@/components/storefront/product-gallery";
import { ProductCard } from "@/components/storefront/product-card";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; productSlug: string }>;
}): Promise<Metadata> {
  const { slug, productSlug } = await params;
  const tenant = await getTenantBySlug(slug).catch(() => null);
  if (!tenant) return { title: "Store not found" };
  const product = await getProduct(productSlug, tenant.id).catch(() => null);
  if (!product) return { title: "Product not found" };
  const description = product.description.slice(0, 160);
  return {
    title: product.title,
    description,
    openGraph: {
      title: product.title,
      description,
      images: product.images[0] ? [{ url: product.images[0] }] : undefined,
    },
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string; productSlug: string }>;
}) {
  const { slug, productSlug } = await params;
  const tenant = await getTenantBySlug(slug).catch(() => null);
  if (!tenant) notFound();
  const product = await getProduct(productSlug, tenant.id).catch(() => null);
  if (!product) notFound();

  const [allProducts, allCollections] = await Promise.all([
    getProducts(tenant.id).catch(() => []),
    getCollections(tenant.id).catch(() => []),
  ]);
  const otherProducts = allProducts
    .filter((p) => p.id !== product.id && p.isActive)
    .slice(0, 4);
  const featuredIn = allCollections.filter((c) =>
    c.productIds.includes(product.id),
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
      <div className="grid animate-in fade-in-0 slide-in-from-bottom-2 grid-cols-1 gap-10 duration-500 lg:grid-cols-2 lg:gap-14">
        <ProductGallery images={product.images} alt={product.title} />
        <div>
          <h1 className="store-heading text-3xl font-semibold">{product.title}</h1>
          <p className="store-accent-text mt-3 text-xl font-medium">
            {formatMoney(product.price)}
          </p>
          <p className="mt-6 max-w-md leading-relaxed store-muted">
            {product.description}
          </p>
          <dl className="store-muted mt-7 grid max-w-xs grid-cols-2 gap-y-3 text-sm">
            <dt>SKU</dt>
            <dd className="text-[var(--store-fg)]">{product.sku}</dd>
            <dt>Availability</dt>
            <dd className="text-[var(--store-fg)]">
              {product.stock > 0 ? `${product.stock} in stock` : "Out of stock"}
            </dd>
          </dl>
          <div className="mt-9">
            <AddToCartButton product={product} />
          </div>
          <p className="store-muted mt-5 max-w-sm text-xs leading-relaxed">
            Adding to cart requests this item — you&apos;ll confirm details
            at checkout and we&apos;ll reach out to arrange payment once your
            order is confirmed.
          </p>
        </div>
      </div>

      {featuredIn.length > 0 && (
        <section className="mt-16 border-t border-[var(--store-border)] pt-12 sm:mt-20 sm:pt-16">
          <h2 className="store-heading text-xl font-semibold sm:text-2xl">
            Featured in these collections
          </h2>
          <p className="store-muted mt-1.5 text-sm">
            This piece also appears in {featuredIn.length === 1 ? "this curated set" : "these curated sets"}.
          </p>
          <div className="mt-7 grid grid-cols-1 gap-5 sm:grid-cols-3">
            {featuredIn.map((collection, i) => (
              <Link
                key={collection.id}
                href={`/${slug}/collections/${collection.slug}`}
                style={{ animationDelay: `${i * 60}ms` }}
                className="store-card group relative block aspect-[16/10] animate-in fade-in-0 slide-in-from-bottom-2 overflow-hidden fill-mode-both duration-500"
              >
                <div
                  className="absolute inset-0 bg-cover bg-center transition-transform duration-300 group-hover:scale-105"
                  style={{ backgroundImage: `url(${collection.coverImage})` }}
                />
                <div className="absolute inset-0 bg-black/35 transition-colors group-hover:bg-black/50" />
                <div className="absolute bottom-0 left-0 p-5">
                  <p className="store-heading text-lg text-white">{collection.title}</p>
                  <p className="text-xs text-white/80">
                    {collection.products.filter((p) => p.isActive).length} pieces
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {otherProducts.length > 0 && (
        <section className="mt-16 border-t border-[var(--store-border)] pt-12 sm:mt-20 sm:pt-16">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="store-heading text-xl font-semibold sm:text-2xl">
                More from {tenant.name}
              </h2>
              <p className="store-muted mt-1.5 text-sm">Other pieces from this shop.</p>
            </div>
            <Link
              href={`/${slug}/products`}
              className="store-nav-link store-accent-text shrink-0 text-sm font-medium"
            >
              View all
            </Link>
          </div>
          <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-5">
            {otherProducts.map((p, i) => (
              <div
                key={p.id}
                style={{ animationDelay: `${i * 60}ms` }}
                className="h-full animate-in fade-in-0 slide-in-from-bottom-2 fill-mode-both duration-500"
              >
                <ProductCard product={p} />
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
