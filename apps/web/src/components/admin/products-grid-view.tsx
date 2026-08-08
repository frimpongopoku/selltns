import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ProductActiveToggle } from "@/components/admin/product-active-toggle";
import { formatMoney } from "@/lib/format";
import type { Product } from "@/lib/types";

export function ProductsGridView({
  products,
  tenantId,
  onToggled,
}: {
  products: Product[];
  tenantId: string;
  onToggled: (id: string, isActive: boolean) => void;
}) {
  return (
    <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {products.map((product, i) => (
        <Card
          key={product.id}
          style={{ animationDelay: `${Math.min(i, 12) * 40}ms` }}
          className="animate-in fade-in-0 slide-in-from-bottom-1 fill-mode-both overflow-hidden p-0 transition-shadow duration-400 hover:shadow-md"
        >
          <Link href={`/admin/products/${product.id}`} className="block">
            <div
              className="aspect-square bg-cover bg-top"
              style={
                product.images[0]
                  ? { backgroundImage: `url(${product.images[0]})` }
                  : { backgroundColor: "var(--muted)" }
              }
            />
          </Link>
          <div className="flex flex-col gap-1.5 p-3">
            <Link href={`/admin/products/${product.id}`} className="hover:underline">
              <p className="truncate text-sm font-medium">{product.title}</p>
            </Link>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{formatMoney(product.price)}</span>
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
          </div>
        </Card>
      ))}
    </div>
  );
}
