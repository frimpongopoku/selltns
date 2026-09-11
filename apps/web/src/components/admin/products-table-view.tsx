import Link from "next/link";
import { ChevronDown, ChevronUp, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ProductActiveToggle } from "@/components/admin/product-active-toggle";
import { formatMoney } from "@/lib/format";
import { discountedPrice, isOnSale } from "@/lib/pricing";
import type { Product } from "@/lib/types";

export function ProductsTableView({
  products,
  tenantId,
  onToggled,
  canReorder,
  hasMore,
  onMove,
  onFlyer,
}: {
  products: Product[];
  tenantId: string;
  onToggled: (id: string, isActive: boolean) => void;
  canReorder?: boolean;
  hasMore?: boolean;
  onMove?: (id: string, direction: "up" | "down") => void;
  onFlyer?: (product: Product) => void;
}) {
  return (
    <Card className="mt-6 p-0">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {canReorder && <TableHead className="w-16">Order</TableHead>}
              <TableHead>Product</TableHead>
              <TableHead>Actions</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Stock</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((product, i) => (
              <TableRow
                key={product.id}
                style={{ animationDelay: `${Math.min(i, 15) * 30}ms` }}
                className="animate-in fade-in-0 fill-mode-both duration-300"
              >
                {canReorder && (
                  <TableCell>
                    <div className="flex gap-0.5">
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="ghost"
                        aria-label={`Move ${product.title} up`}
                        disabled={i === 0}
                        onClick={() => onMove?.(product.id, "up")}
                      >
                        <ChevronUp className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="ghost"
                        aria-label={`Move ${product.title} down`}
                        disabled={i === products.length - 1 && Boolean(hasMore)}
                        onClick={() => onMove?.(product.id, "down")}
                      >
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                )}
                <TableCell className="whitespace-normal">
                  <Link
                    href={`/admin/products/${product.id}`}
                    className="flex max-w-[200px] items-center gap-3 hover:underline"
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
                {/* Kept right after Product (not at the far right, past SKU/Price/Stock)
                    so the flyer button and visibility toggle stay reachable without
                    scrolling a narrow table on a phone. */}
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="gap-1.5 text-xs"
                      onClick={() => onFlyer?.(product)}
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      Flyer
                    </Button>
                    <ProductActiveToggle
                      productId={product.id}
                      tenantId={tenantId}
                      initialActive={product.isActive}
                      onToggled={(isActive) => onToggled(product.id, isActive)}
                    />
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">{product.sku}</TableCell>
                <TableCell>
                  {isOnSale(product) ? (
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-xs text-muted-foreground line-through">
                        {formatMoney(product.price)}
                      </span>
                      <span>{formatMoney(discountedPrice(product))}</span>
                    </div>
                  ) : (
                    formatMoney(product.price)
                  )}
                </TableCell>
                <TableCell className={product.trackStock && product.stock <= 0 ? "text-destructive" : ""}>
                  {product.trackStock ? product.stock : "Always available"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}
