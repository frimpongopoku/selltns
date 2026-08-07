import { redirect } from "next/navigation";
import { getMe } from "@/lib/get-me";
import { CollectionForm } from "@/components/admin/collection-form";

export const metadata = { title: "New collection" };

export default async function NewCollectionPage() {
  const me = await getMe();
  if (!me) redirect("/admin/login");

  return (
    <div>
      <h1 className="text-2xl font-semibold">New collection</h1>
      <p className="text-sm text-muted-foreground">Group products into a themed set.</p>
      <div className="mt-7">
        <CollectionForm tenantId={me.tenant.id} />
      </div>
    </div>
  );
}
