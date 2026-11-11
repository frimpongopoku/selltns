import Link from "next/link";
import { ChevronDown, ChevronUp, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ProductActiveToggle } from "@/components/admin/product-active-toggle";
import { formatMoney } from "@/lib/format";
import { discountedPrice, isOnSale } from "@/lib/pricing";
import { productOptionsLine } from "@/lib/item-options";
import { productImagePosition } from "@/lib/image-focus";
import type { Product } from "@/lib/types";

import { hasName, productName, productNumber } from "@/lib/product-name";
export function ProductsGridView({
  products,
  tenantId,
  onToggled,
  canReorder,
  hasMore,
  onMove,
  onFlyer,
  selectMode,
  selectedIds,
  onSelect,
}: {
  products: Product[];
  tenantId: string;
  onToggled: (id: string, isActive: boolean) => void;
  canReorder?: boolean;
  hasMore?: boolean;
  onMove?: (id: string, direction: "up" | "down") => void;
  onFlyer?: (product: Product) => void;
  selectMode?: boolean;
  selectedIds?: Set<string>;
  onSelect?: (product: Product, e: React.MouseEvent) => void;
}) {
  // In select mode — or with ⌘/Ctrl/Shift held — clicking a product picks it
  // instead of opening it.
  function handleOpenClick(e: React.MouseEvent, product: Product) {
    if (!onSelect) return;
    if (selectMode || e.metaKey || e.ctrlKey || e.shiftKey) {
      e.preventDefault();
      onSelect(product, e);
    }
  }

  return (
    <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {products.map((product, i) => (
        <Card
          key={product.id}
          style={{ animationDelay: `${Math.min(i, 12) * 40}ms` }}
          className={`animate-in fade-in-0 slide-in-from-bottom-1 fill-mode-both overflow-hidden p-0 transition-shadow duration-400 hover:shadow-md ${
            selectedIds?.has(product.id) ? "ring-2 ring-primary" : ""
          } ${selectMode ? "select-none" : ""}`}
        >
          <Link
            href={`/admin/products/${product.id}`}
            onClick={(e) => handleOpenClick(e, product)}
            className="relative block"
          >
            {selectMode && (
              <span className="absolute left-1.5 top-1.5 z-10 rounded-[5px] bg-background/90 p-1 shadow-sm">
                <Checkbox
                  checked={selectedIds?.has(product.id) ?? false}
                  tabIndex={-1}
                  className="pointer-events-none"
                  aria-label={`Select ${productName(product)}`}
                />
              </span>
            )}
            <div
              className="aspect-square bg-cover bg-top"
              style={
                product.images[0]
                  ? {
                            backgroundImage: `url(${product.images[0]})`,
                            backgroundPosition: productImagePosition(product, product.images[0]),
                          }
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
            <Link
              href={`/admin/products/${product.id}`}
              onClick={(e) => handleOpenClick(e, product)}
              className="hover:underline"
            >
              {hasName(product) ? (
                <p className="flex items-baseline gap-1.5 text-sm font-medium">
                  <span className="truncate">{product.title}</span>
                  <span className="ml-auto shrink-0 text-xs font-normal text-muted-foreground tabular-nums">
                    {productNumber(product)}
                  </span>
                </p>
              ) : (
                <p className="truncate text-sm font-medium text-muted-foreground">{productName(product)}</p>
              )}
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
              <span className={product.trackStock && product.stock <= 0 ? "text-destructive" : ""}>
                {product.trackStock ? `${product.stock} in stock` : "Always available"}
              </span>
            </div>
            {product.sizes.length > 0 && (
              <p className="truncate text-xs" title={`Sizes: ${productOptionsLine(product.sizes)}`}>
                <span className="text-muted-foreground">Sizes </span>
                {productOptionsLine(product.sizes)}
              </p>
            )}
            {product.colors.length > 0 && (
              <p className="-mt-1 truncate text-xs" title={`Colors: ${productOptionsLine(product.colors)}`}>
                <span className="text-muted-foreground">Colors </span>
                {productOptionsLine(product.colors)}
              </p>
            )}
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
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  size="icon-sm"
                  variant="ghost"
                  aria-label={`Flyer for ${productName(product)}`}
                  onClick={() => onFlyer?.(product)}
                >
                  <Sparkles className="h-4 w-4" />
                </Button>
                <ProductActiveToggle
                  key={`${product.id}-${product.isActive}`}
                  productId={product.id}
                  tenantId={tenantId}
                  initialActive={product.isActive}
                  onToggled={(isActive) => onToggled(product.id, isActive)}
                />
              </div>
            </div>
            {canReorder && !selectMode && (
              <div className="-mb-1 -mt-0.5 flex items-center justify-center gap-1 border-t pt-1.5">
                <Button
                  type="button"
                  size="icon-sm"
                  variant="ghost"
                  aria-label={`Move ${productName(product)} up`}
                  disabled={i === 0}
                  onClick={() => onMove?.(product.id, "up")}
                >
                  <ChevronUp className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  size="icon-sm"
                  variant="ghost"
                  aria-label={`Move ${productName(product)} down`}
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
