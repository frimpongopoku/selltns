import { redirect } from "next/navigation";
import { getMe } from "@/lib/get-me";
import { CollectionQuickCreateDialog } from "@/components/admin/collection-quick-create-dialog";
import { CollectionsExplorer } from "@/components/admin/collections-explorer";

export const metadata = { title: "Collections" };

export default async function AdminCollectionsPage() {
  const me = await getMe();
  if (!me) redirect("/admin/login");

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Collections</h1>
          <p className="text-sm text-muted-foreground">
            Curated sets of products — each can have its own theme and SEO.
          </p>
        </div>
        <CollectionQuickCreateDialog tenantId={me.tenant.id} />
      </div>

      <CollectionsExplorer tenantId={me.tenant.id} />
    </div>
  );
}
