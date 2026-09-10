import { notFound, redirect } from "next/navigation";
import { getCollection } from "@/lib/api";
import { getMe } from "@/lib/get-me";
import { requireRole } from "@/lib/require-role";
import { CollectionForm } from "@/components/admin/collection-form";
import { CollectionFlyerManager } from "@/components/admin/collection-flyer-manager";

export default async function EditCollectionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const me = await getMe();
  if (!me) redirect("/admin/login");
  requireRole(me.role, ["OWNER", "MANAGER"]);
  const collection = await getCollection(id, me.tenant.id).catch(() => null);
  if (!collection) notFound();

  return (
    <div>
      <h1 className="text-2xl font-semibold">{collection.title}</h1>
      <p className="text-sm text-muted-foreground">Edit collection details.</p>
      <div className="mt-7">
        <CollectionForm tenantId={me.tenant.id} collection={collection} />
      </div>

      <div className="mt-12 max-w-3xl border-t pt-8">
        <h2 className="text-lg font-semibold">Share flyer</h2>
        <p className="text-sm text-muted-foreground">
          A branded, downloadable flyer for this collection — photo, name, and price for each
          product, your logo, and a QR code back to this page. Great for WhatsApp and social.
        </p>
        <div className="mt-5">
          <CollectionFlyerManager tenant={me.tenant} collection={collection} />
        </div>
      </div>
    </div>
  );
}
