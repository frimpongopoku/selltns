import { redirect } from "next/navigation";
import Link from "next/link";
import { getMe } from "@/lib/get-me";
import { getCollections, getOrders } from "@/lib/api";
import { OrdersTable } from "@/components/admin/orders-table";
import { CollectionQuickCreateDialog } from "@/components/admin/collection-quick-create-dialog";

export const metadata = { title: "Pre-orders" };

export default async function AdminPreordersPage() {
  const me = await getMe();
  if (!me) redirect("/admin/login");

  const [collections, orders] = await Promise.all([
    getCollections(me.tenant.id),
    getOrders(me.tenant.id),
  ]);

  const preorderCollections = collections.filter((c) => c.type === "PREORDER");
  const preorderOrders = orders.filter((o) => o.type === "PREORDER");

  return (
    <div>
      <h1 className="text-2xl font-semibold">Pre-orders</h1>
      <p className="text-sm text-muted-foreground">
        Manage pre-order collections and track deposits, updates, and balances in one place.
      </p>

      <div className="mt-8">
        <h2 className="text-lg font-medium">Pre-order requests</h2>
        <div className="mt-4">
          <OrdersTable tenant={me.tenant} orders={preorderOrders} />
        </div>
      </div>

      <div className="mt-10 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-medium">Pre-order collections</h2>
        <CollectionQuickCreateDialog
          tenantId={me.tenant.id}
          defaultPreorder
          triggerLabel="New pre-order collection"
        />
      </div>
      {preorderCollections.length === 0 ? (
        <p className="mt-4 rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          No pre-order collections yet — create one to start taking deposits on made-to-order items.
        </p>
      ) : (
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {preorderCollections.map((collection, i) => (
            <Link
              key={collection.id}
              href={`/admin/collections/${collection.id}`}
              style={{ animationDelay: `${i * 60}ms` }}
              className="animate-in fade-in-0 slide-in-from-bottom-1 fill-mode-both rounded-lg border p-4 transition-colors duration-400 hover:bg-muted/40 hover:shadow-sm"
            >
              <p className="flex items-center gap-2 font-medium">
                {collection.title}
                {!collection.isActive && (
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                    Not live
                  </span>
                )}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {collection.depositType === "FULL"
                  ? "Full payment upfront"
                  : `${collection.depositPercentage}% deposit`}
                {" · "}
                {collection.products.length} product{collection.products.length === 1 ? "" : "s"}
              </p>
              {collection.fulfillmentNote && (
                <p className="mt-2 text-xs text-muted-foreground">{collection.fulfillmentNote}</p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
