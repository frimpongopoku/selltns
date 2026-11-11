import Link from "next/link";
import { redirect } from "next/navigation";
import { ClipboardList } from "lucide-react";
import { getProducts } from "@/lib/api";
import { getMe } from "@/lib/get-me";
import { getCanonicalUrl } from "@/lib/canonical";
import { ProductQuickCreateDialog } from "@/components/admin/product-quick-create-dialog";
import { ProductBulkCreateDialog } from "@/components/admin/product-bulk-create-dialog";
import { ProductsExplorer } from "@/components/admin/products-explorer";
import { FeedLinkButton } from "@/components/admin/feed-link-button";
import { getSessionToken } from "@/lib/session";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4311";

// How many team-sheet suggestions are waiting for review. Best effort: the
// button still shows if this fails.
async function getSheetCount(): Promise<number | null> {
  const token = await getSessionToken();
  if (!token) return null;
  try {
    const res = await fetch(`${API_URL}/product-sheet/pending-count`, {
      cache: "no-store",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    return ((await res.json()) as { count: number }).count;
  } catch {
    return null;
  }
}

export const metadata = { title: "Products" };

export default async function AdminProductsPage() {
  const me = await getMe();
  if (!me) redirect("/admin/login");
  const canReview = me.role === "OWNER" || me.role === "MANAGER";
  const [products, sheetCount] = await Promise.all([
    getProducts(me.tenant.id),
    canReview ? getSheetCount() : Promise.resolve(null),
  ]);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Products</h1>
          <p className="text-sm text-muted-foreground">
            {products.length} products in your catalog.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canReview && (
            <Link
              href="/admin/products/sheet"
              className="inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-sm font-medium hover:bg-muted"
            >
              <ClipboardList className="h-4 w-4" />
              Team sheet
              {sheetCount ? (
                <span className="rounded-full bg-primary px-1.5 text-[11px] font-semibold text-primary-foreground">
                  {sheetCount} to review
                </span>
              ) : null}
            </Link>
          )}
          <FeedLinkButton url={getCanonicalUrl(me.tenant, "/feed.xml")} />
          <ProductBulkCreateDialog tenantId={me.tenant.id} />
          <ProductQuickCreateDialog tenantId={me.tenant.id} />
        </div>
      </div>

      <ProductsExplorer tenantId={me.tenant.id} tenant={me.tenant} />
    </div>
  );
}
