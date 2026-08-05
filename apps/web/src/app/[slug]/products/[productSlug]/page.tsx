import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getProduct, getTenantBySlug } from "@/lib/api";
import { formatMoney } from "@/lib/format";
import { AddToCartButton } from "@/components/storefront/add-to-cart-button";
import { ProductGallery } from "@/components/storefront/product-gallery";

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
    </div>
  );
}
