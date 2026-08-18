import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getCollections, getTenantBySlug } from "@/lib/api";
import { getCanonicalUrl } from "@/lib/canonical";
import { isCustomDomainRequest } from "@/lib/request-host";
import { storeHref } from "@/lib/store-href";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const tenant = await getTenantBySlug(slug).catch(() => null);
  if (!tenant) return { title: "Store not found" };
  const title = `Collections — ${tenant.name}`;
  const description = `Curated sets of pieces from ${tenant.name}, each with its own look and story.`;
  const canonical = getCanonicalUrl(tenant, "/collections");
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: { title, description, url: canonical, type: "website" },
  };
}

export default async function CollectionsIndexPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const tenant = await getTenantBySlug(slug).catch(() => null);
  if (!tenant) notFound();
  const [collections, isCustomDomain] = await Promise.all([
    getCollections(tenant.id).then((cs) => cs.filter((c) => c.isActive)),
    isCustomDomainRequest(),
  ]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-16 lg:px-8">
      <h1 className="store-heading text-3xl font-semibold">Collections</h1>
      <p className="store-muted mt-3 max-w-lg leading-relaxed">
        Curated sets of pieces, each with its own look and story.
      </p>
      {collections.length === 0 ? (
        <p className="store-muted mt-8">No collections yet. Check back soon.</p>
      ) : (
      <div className="mt-9 grid grid-cols-1 gap-6 sm:grid-cols-2">
        {collections.map((collection, i) => (
          <Link
            key={collection.id}
            href={storeHref(slug, isCustomDomain, `/collections/${collection.slug}`)}
            style={{ animationDelay: `${i * 60}ms` }}
            className="store-card group relative block aspect-[16/9] animate-in fade-in-0 slide-in-from-bottom-2 overflow-hidden fill-mode-both duration-500"
          >
            <div
              className="absolute inset-0 bg-cover bg-top transition-transform duration-300 group-hover:scale-105"
              style={{ backgroundImage: `url(${collection.coverImage})` }}
            />
            <div className="absolute inset-0 bg-black/35 transition-colors group-hover:bg-black/50" />
            <div className="absolute bottom-0 left-0 p-6">
              <p className="store-heading text-2xl text-white">
                {collection.title}
              </p>
              <p className="mt-1.5 max-w-sm text-sm text-white/80">
                {collection.description}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {collection.type === "PREORDER" && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/90 px-2.5 py-1 text-xs font-medium text-white">
                    Pre-order
                  </span>
                )}
                {collection.themeOverride && (
                  <span className="inline-block rounded-full bg-white/20 px-2.5 py-1 text-xs text-white">
                    Styled differently
                  </span>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>
      )}
    </div>
  );
}
