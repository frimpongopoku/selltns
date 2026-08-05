import { redirect } from "next/navigation";
import { getMe } from "@/lib/get-me";
import { ProductForm } from "@/components/admin/product-form";

export const metadata = { title: "New product" };

export default async function NewProductPage() {
  const me = await getMe();
  if (!me) redirect("/admin/login");

  return (
    <div>
      <h1 className="text-2xl font-semibold">New product</h1>
      <p className="text-sm text-muted-foreground">Add a product to your catalog.</p>
      <div className="mt-7">
        <ProductForm tenantId={me.tenant.id} />
      </div>
    </div>
  );
}
