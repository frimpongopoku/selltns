import Link from "next/link";
import { redirect } from "next/navigation";
import { getCollections, getProducts } from "@/lib/api";
import { getMe } from "@/lib/get-me";
import { Card } from "@/components/ui/card";
import { CollectionQuickCreateDialog } from "@/components/admin/collection-quick-create-dialog";

export const metadata = { title: "Collections" };

export default async function AdminCollectionsPage() {
  const me = await getMe();
  if (!me) redirect("/admin/login");
  const [collections, products] = await Promise.all([
    getCollections(me.tenant.id),
    getProducts(me.tenant.id),
  ]);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Collections</h1>
          <p className="text-sm text-muted-foreground">
            Curated sets of products — each can have its own theme and SEO.
          </p>
        </div>
        <CollectionQuickCreateDialog tenantId={me.tenant.id} products={products} />
      </div>

      {collections.length === 0 ? (
        <Card className="mt-7 flex flex-col items-center gap-3 py-16 text-center">
          <p className="font-medium">No collections yet</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            Group related products into a collection — it&apos;ll get its own
            page on your storefront, and you can even give it a different theme.
          </p>
          <div className="mt-2">
            <CollectionQuickCreateDialog tenantId={me.tenant.id} products={products} />
          </div>
        </Card>
      ) : (
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
      )}
    </div>
  );
}
