import { notFound, redirect } from "next/navigation";
import { getProduct } from "@/lib/api";
import { getMe } from "@/lib/get-me";
import { ProductForm } from "@/components/admin/product-form";

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const me = await getMe();
  if (!me) redirect("/admin/login");
  const product = await getProduct(id, me.tenant.id).catch(() => null);
  if (!product) notFound();

  return (
    <div>
      <h1 className="text-2xl font-semibold">{product.title}</h1>
      <p className="text-sm text-muted-foreground">Edit product details.</p>
      <div className="mt-7">
        <ProductForm tenantId={me.tenant.id} product={product} />
      </div>
    </div>
  );
}
