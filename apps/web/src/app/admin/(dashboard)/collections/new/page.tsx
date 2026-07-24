import { getProducts } from "@/lib/api";
import { CollectionForm } from "@/components/admin/collection-form";

export const metadata = { title: "New collection" };

export default async function NewCollectionPage() {
  const products = await getProducts();

  return (
    <div>
      <h1 className="text-2xl font-semibold">New collection</h1>
      <p className="text-sm text-muted-foreground">Group products into a themed set.</p>
      <div className="mt-7">
        <CollectionForm products={products} />
      </div>
    </div>
  );
}
