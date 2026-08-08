import Link from "next/link";
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
import { formatMoney } from "@/lib/format";
import type { Product } from "@/lib/types";

export function ProductsTableView({
  products,
  tenantId,
  onToggled,
}: {
  products: Product[];
  tenantId: string;
  onToggled: (id: string, isActive: boolean) => void;
}) {
  return (
    <Card className="mt-6 p-0">
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
            {products.map((product, i) => (
              <TableRow
                key={product.id}
                style={{ animationDelay: `${Math.min(i, 15) * 30}ms` }}
                className="animate-in fade-in-0 fill-mode-both duration-300"
              >
                <TableCell>
                  <Link
                    href={`/admin/products/${product.id}`}
                    className="flex items-center gap-3 hover:underline"
                  >
                    <div
                      className="h-10 w-10 shrink-0 rounded-md bg-cover bg-top"
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
                    tenantId={tenantId}
                    initialActive={product.isActive}
                    onToggled={(isActive) => onToggled(product.id, isActive)}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}
