import Link from "next/link";
import { redirect } from "next/navigation";
import { getProducts } from "@/lib/api";
import { getMe } from "@/lib/get-me";
import { formatMoney } from "@/lib/format";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ProductActiveToggle } from "@/components/admin/product-active-toggle";
import { ProductQuickCreateDialog } from "@/components/admin/product-quick-create-dialog";

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

      {products.length === 0 ? (
        <Card className="mt-7 flex flex-col items-center gap-3 py-16 text-center">
          <p className="font-medium">No products yet</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            Add your first product to start building your catalog — it&apos;ll
            show up here and on your storefront once it&apos;s active.
          </p>
          <div className="mt-2">
            <ProductQuickCreateDialog tenantId={me.tenant.id} />
          </div>
        </Card>
      ) : (
      <Card className="mt-7 p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Visible</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((product) => (
                <TableRow key={product.id}>
                  <TableCell>
                    <Link
                      href={`/admin/products/${product.id}`}
                      className="flex items-center gap-3 hover:underline"
                    >
                      <div
                        className="h-10 w-10 shrink-0 rounded-md bg-cover bg-center"
                        style={
                          product.images[0]
                            ? { backgroundImage: `url(${product.images[0]})` }
                            : { backgroundColor: "var(--muted)" }
                        }
                      />
                      {product.title}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{product.sku}</TableCell>
                  <TableCell>{formatMoney(product.price)}</TableCell>
                  <TableCell className={product.stock <= 0 ? "text-destructive" : ""}>
                    {product.stock}
                  </TableCell>
                  <TableCell>
                    <ProductActiveToggle
                      productId={product.id}
                      tenantId={me.tenant.id}
                      initialActive={product.isActive}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
      )}
    </div>
  );
}
