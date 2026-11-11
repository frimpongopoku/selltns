import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { getMe } from "@/lib/get-me";
import { requireRole } from "@/lib/require-role";
import { ProductSheetManager } from "@/components/admin/product-sheet-manager";
import { ProductSheetHelp } from "@/components/product-sheet/product-sheet-help";

export const metadata = { title: "Team sheet" };

export default async function AdminProductSheetPage() {
  const me = await getMe();
  if (!me) redirect("/admin/login");
  requireRole(me.role, ["OWNER", "MANAGER"]);

  return (
    <div>
      <Link
        href="/admin/products"
        className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" />
        Products
      </Link>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold">Team sheet</h1>
          <p className="text-sm text-muted-foreground">
            Your team suggests product changes and new products from a link.
            Nothing goes live until you publish it.
          </p>
        </div>
        <ProductSheetHelp audience="admin" />
      </div>
      <div className="mt-7">
        <ProductSheetManager tenantId={me.tenant.id} />
      </div>
    </div>
  );
}
