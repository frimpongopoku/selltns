import { notFound, redirect } from "next/navigation";
import { getCollection } from "@/lib/api";
import { getMe } from "@/lib/get-me";
import { CollectionForm } from "@/components/admin/collection-form";

export default async function EditCollectionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const me = await getMe();
  if (!me) redirect("/admin/login");
  const collection = await getCollection(id, me.tenant.id).catch(() => null);
  if (!collection) notFound();

  return (
    <div>
      <h1 className="text-2xl font-semibold">{collection.title}</h1>
      <p className="text-sm text-muted-foreground">Edit collection details.</p>
      <div className="mt-7">
        <CollectionForm tenantId={me.tenant.id} collection={collection} />
      </div>
    </div>
  );
}
