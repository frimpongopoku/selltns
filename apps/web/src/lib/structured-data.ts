import type { Collection, CollectionWithProducts, Product, Tenant } from "./types";
import { getCanonicalUrl } from "./canonical";

// Plain JSON-LD builders — rendered via a <script type="application/ld+json">
// tag on the relevant page. No library needed; schema.org JSON-LD is just
// a plain object with an @context/@type.

export function storeJsonLd(tenant: Tenant) {
  return {
    "@context": "https://schema.org",
    "@type": "Store",
    name: tenant.name,
    url: getCanonicalUrl(tenant),
    ...(tenant.whatsappNumber ? { telephone: `+${tenant.whatsappNumber}` } : {}),
  };
}

export function productJsonLd(tenant: Tenant, product: Product) {
  const availability = product.preorder
    ? "https://schema.org/PreOrder"
    : product.stock > 0
      ? "https://schema.org/InStock"
      : "https://schema.org/OutOfStock";

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
    description: product.description,
    sku: product.sku || undefined,
    image: product.images.length ? product.images : undefined,
    url: getCanonicalUrl(tenant, `/products/${product.slug}`),
    offers: {
      "@type": "Offer",
      price: product.price,
      priceCurrency: "GHS",
      availability,
      url: getCanonicalUrl(tenant, `/products/${product.slug}`),
    },
  };
}

export function collectionJsonLd(tenant: Tenant, collection: CollectionWithProducts | Collection) {
  const products = "products" in collection ? collection.products : [];
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: collection.title,
    description: collection.description || undefined,
    url: getCanonicalUrl(tenant, `/collections/${collection.slug}`),
    mainEntity: {
      "@type": "ItemList",
      itemListElement: products
        .filter((p) => p.isActive)
        .map((product, index) => ({
          "@type": "ListItem",
          position: index + 1,
          url: getCanonicalUrl(tenant, `/products/${product.slug}`),
          name: product.title,
        })),
    },
  };
}

// Renders as JSON-LD. `JSON.stringify` is safe here (no user-controlled
// `</script>` injection risk in practice — titles/descriptions are
// vendor-authored admin content), but escape `<` defensively anyway.
export function jsonLdScriptProps(data: unknown) {
  return { __html: JSON.stringify(data).replace(/</g, "\\u003c") };
}
