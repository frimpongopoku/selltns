import { notFound } from "next/navigation";
import { getCollection, getProducts } from "@/lib/api";
import { CollectionForm } from "@/components/admin/collection-form";

export default async function EditCollectionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [collection, products] = await Promise.all([
    getCollection(id).catch(() => null),
    getProducts(),
  ]);
  if (!collection) notFound();

  return (
    <div>
      <h1 className="text-2xl font-semibold">{collection.title}</h1>
      <p className="text-sm text-muted-foreground">Edit collection details.</p>
      <div className="mt-7">
        <CollectionForm collection={collection} products={products} />
      </div>
    </div>
  );
}
