import { redirect } from "next/navigation";
import { getProducts } from "@/lib/api";
import { getMe } from "@/lib/get-me";
import { ProductQuickCreateDialog } from "@/components/admin/product-quick-create-dialog";
import { ProductsExplorer } from "@/components/admin/products-explorer";

export const metadata = { title: "Products" };

export default async function AdminProductsPage() {
  const me = await getMe();
  if (!me) redirect("/admin/login");
  const products = await getProducts(me.tenant.id);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Products</h1>
          <p className="text-sm text-muted-foreground">
            {products.length} products in your catalog.
          </p>
        </div>
        <ProductQuickCreateDialog tenantId={me.tenant.id} />
      </div>

      <ProductsExplorer tenantId={me.tenant.id} />
    </div>
  );
}
