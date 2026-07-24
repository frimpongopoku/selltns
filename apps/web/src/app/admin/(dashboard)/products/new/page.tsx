import { ProductForm } from "@/components/admin/product-form";

export const metadata = { title: "New product" };

export default function NewProductPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold">New product</h1>
      <p className="text-sm text-muted-foreground">Add a product to your catalog.</p>
      <div className="mt-7">
        <ProductForm />
      </div>
    </div>
  );
}
