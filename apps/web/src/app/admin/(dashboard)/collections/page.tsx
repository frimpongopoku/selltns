import Link from "next/link";
import { Plus } from "lucide-react";
import { getCollections } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export const metadata = { title: "Collections" };

export default async function AdminCollectionsPage() {
  const collections = await getCollections();

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Collections</h1>
          <p className="text-sm text-muted-foreground">
            Curated sets of products — each can have its own theme and SEO.
          </p>
        </div>
        <Link href="/admin/collections/new">
          <Button className="gap-1.5">
            <Plus className="h-4 w-4" />
            New collection
          </Button>
        </Link>
      </div>

      <div className="mt-7 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {collections.map((collection, i) => (
          <Link
            key={collection.id}
            href={`/admin/collections/${collection.id}`}
            style={{ animationDelay: `${i * 50}ms` }}
            className="animate-in fade-in-0 slide-in-from-bottom-1 fill-mode-both duration-300"
          >
            <Card className="overflow-hidden p-0 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
              <div className="aspect-video overflow-hidden">
                <div
                  className="h-full w-full bg-cover bg-center transition-transform duration-300 hover:scale-105"
                  style={{ backgroundImage: `url(${collection.coverImage})` }}
                />
              </div>
              <div className="p-5">
                <p className="font-medium">{collection.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {collection.products.length} products
                  {collection.themeOverride ? " · custom theme" : ""}
                </p>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
