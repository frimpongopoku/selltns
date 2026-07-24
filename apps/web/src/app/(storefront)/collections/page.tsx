import Link from "next/link";
import { getCollections } from "@/lib/api";

export const metadata = { title: "Collections" };

export default async function CollectionsIndexPage() {
  const collections = await getCollections();

  return (
    <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-16 lg:px-8">
      <h1 className="store-heading text-3xl font-semibold">Collections</h1>
      <p className="store-muted mt-3 max-w-lg leading-relaxed">
        Curated sets of pieces — each with its own look and story.
      </p>
      <div className="mt-9 grid grid-cols-1 gap-6 sm:grid-cols-2">
        {collections.map((collection, i) => (
          <Link
            key={collection.id}
            href={`/collections/${collection.slug}`}
            style={{ animationDelay: `${i * 60}ms` }}
            className="store-card group relative block aspect-[16/9] animate-in fade-in-0 slide-in-from-bottom-2 overflow-hidden fill-mode-both duration-500"
          >
            <div
              className="absolute inset-0 bg-cover bg-center transition-transform duration-300 group-hover:scale-105"
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
              {collection.themeOverride && (
                <span className="mt-3 inline-block rounded-full bg-white/20 px-2.5 py-1 text-xs text-white">
                  Styled differently
                </span>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
