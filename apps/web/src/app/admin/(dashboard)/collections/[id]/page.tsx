import { notFound, redirect } from "next/navigation";
import { getCollection } from "@/lib/api";
import { getMe } from "@/lib/get-me";
import { requireRole } from "@/lib/require-role";
import { getCanonicalUrl } from "@/lib/canonical";
import { CollectionForm } from "@/components/admin/collection-form";
import { CollectionFlyerManager } from "@/components/admin/collection-flyer-manager";
import { FeedLinkButton } from "@/components/admin/feed-link-button";
import { AffiliateCollectionItemsManager } from "@/components/admin/affiliate-collection-items-manager";

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
    <div className="pb-24">
      <h1 className="text-2xl font-semibold">{collection.title}</h1>
      <p className="text-sm text-muted-foreground">Edit collection details.</p>
      <div className="mt-7">
        <CollectionForm tenantId={me.tenant.id} collection={collection} floatingSubmit />
      </div>

      <AffiliateCollectionItemsManager tenantId={me.tenant.id} collectionId={collection.id} />

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

      <div className="mt-12 max-w-3xl border-t pt-8">
        <h2 className="text-lg font-semibold">Feed</h2>
        <p className="text-sm text-muted-foreground">
          Every live product in this collection, as an RSS feed — connect it to any tool that
          reads one, including Pinterest&apos;s auto-publish feature, to keep it updated
          automatically.
        </p>
        <div className="mt-3">
          <FeedLinkButton
            url={getCanonicalUrl(me.tenant, `/collections/${collection.slug}/feed.xml`)}
          />
        </div>
      </div>
    </div>
  );
}
