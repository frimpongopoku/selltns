import { notFound, redirect } from "next/navigation";
import { getProduct } from "@/lib/api";
import { getMe } from "@/lib/get-me";
import { ProductForm } from "@/components/admin/product-form";
import { ProductFlyerManager } from "@/components/admin/product-flyer-manager";

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

      <div className="mt-12 max-w-3xl border-t pt-8">
        <h2 className="text-lg font-semibold">Share flyer</h2>
        <p className="text-sm text-muted-foreground">
          A branded, downloadable flyer for this product — photo, price, and a QR code back to
          its page. Great for WhatsApp and social.
        </p>
        <div className="mt-5">
          <ProductFlyerManager tenant={me.tenant} product={product} />
        </div>
      </div>
    </div>
  );
}
