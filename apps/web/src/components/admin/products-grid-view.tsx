import Link from "next/link";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ProductActiveToggle } from "@/components/admin/product-active-toggle";
import { formatMoney } from "@/lib/format";
import { discountedPrice, isOnSale } from "@/lib/pricing";
import type { Product } from "@/lib/types";

export function ProductsGridView({
  products,
  tenantId,
  onToggled,
  canReorder,
  hasMore,
  onMove,
}: {
  products: Product[];
  tenantId: string;
  onToggled: (id: string, isActive: boolean) => void;
  canReorder?: boolean;
  hasMore?: boolean;
  onMove?: (id: string, direction: "up" | "down") => void;
}) {
  return (
    <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {products.map((product, i) => (
        <Card
          key={product.id}
          style={{ animationDelay: `${Math.min(i, 12) * 40}ms` }}
          className="animate-in fade-in-0 slide-in-from-bottom-1 fill-mode-both overflow-hidden p-0 transition-shadow duration-400 hover:shadow-md"
        >
          <Link href={`/admin/products/${product.id}`} className="relative block">
            <div
              className="aspect-square bg-cover bg-top"
              style={
                product.images[0]
                  ? { backgroundImage: `url(${product.images[0]})` }
                  : { backgroundColor: "var(--muted)" }
              }
            />
            {isOnSale(product) && (
              <span className="absolute right-1.5 top-1.5 rounded-full bg-red-600/90 px-2 py-0.5 text-[10px] font-medium text-white">
                Sale
              </span>
            )}
          </Link>
          <div className="flex flex-col gap-1.5 p-3">
            <Link href={`/admin/products/${product.id}`} className="hover:underline">
              <p className="truncate text-sm font-medium">{product.title}</p>
            </Link>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              {isOnSale(product) ? (
                <span className="flex items-baseline gap-1">
                  <span className="line-through">{formatMoney(product.price)}</span>
                  <span className="font-medium text-foreground">
                    {formatMoney(discountedPrice(product))}
                  </span>
                </span>
              ) : (
                <span>{formatMoney(product.price)}</span>
              )}
              <span className={product.stock <= 0 ? "text-destructive" : ""}>
                {product.stock} in stock
              </span>
            </div>
            {product.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {product.tags.slice(0, 3).map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-[10px]">
                    {tag}
                  </Badge>
                ))}
                {product.tags.length > 3 && (
                  <span className="text-[10px] text-muted-foreground">
                    +{product.tags.length - 3}
                  </span>
                )}
              </div>
            )}
            <div className="mt-1 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{product.isActive ? "Live" : "Not live"}</span>
              <ProductActiveToggle
                productId={product.id}
                tenantId={tenantId}
                initialActive={product.isActive}
                onToggled={(isActive) => onToggled(product.id, isActive)}
              />
            </div>
            {canReorder && (
              <div className="-mb-1 -mt-0.5 flex items-center justify-center gap-1 border-t pt-1.5">
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
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}
