import { notFound } from "next/navigation";
import Image from "next/image";
import type { Metadata } from "next";
import { getProduct } from "@/lib/api";
import { formatMoney } from "@/lib/format";
import { AddToCartButton } from "@/components/storefront/add-to-cart-button";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProduct(slug).catch(() => null);
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
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getProduct(slug).catch(() => null);
  if (!product) notFound();

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
      <div className="grid animate-in fade-in-0 slide-in-from-bottom-2 grid-cols-1 gap-10 duration-500 lg:grid-cols-2 lg:gap-14">
        <div className="grid grid-cols-1 gap-3">
          <div className="store-card relative aspect-square overflow-hidden">
            {product.images[0] ? (
              <Image
                src={product.images[0]}
                alt={product.title}
                fill
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover"
                priority
              />
            ) : null}
          </div>
          {product.images.length > 1 && (
            <div className="grid grid-cols-4 gap-3">
              {product.images.slice(1).map((img) => (
                <div key={img} className="store-card relative aspect-square overflow-hidden transition-opacity hover:opacity-80">
                  <Image src={img} alt={product.title} fill sizes="120px" className="object-cover" />
                </div>
              ))}
            </div>
          )}
        </div>
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
