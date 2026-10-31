"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CopyPlus, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ProductPicker, ProductThumb } from "@/components/admin/product-picker";
import { createManualOrder } from "@/lib/api";
import { formatMoney } from "@/lib/format";
import { discountedPrice } from "@/lib/pricing";
import type { Product } from "@/lib/types";

interface DraftLine {
  key: string;
  product: Product;
  quantity: string;
  price: string;
  size: string;
  color: string;
}

let lineSeq = 0;
function newLine(product: Product): DraftLine {
  lineSeq += 1;
  return {
    key: `line-${lineSeq}`,
    product,
    quantity: "1",
    price: String(discountedPrice(product)),
    size: product.sizes.length === 1 ? product.sizes[0] : "",
    color: product.colors.length === 1 ? product.colors[0] : "",
  };
}

function today(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const selectClassName =
  "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

// For sales the vendor made outside the storefront (in person, by phone, in
// DMs): records them so they count toward sales and stock. The order goes
// straight to confirmed/completed and no emails are sent.
export function ManualOrderForm({ tenantId }: { tenantId: string }) {
  const router = useRouter();
  const [lines, setLines] = useState<DraftLine[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [customerContact, setCustomerContact] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [orderedOn, setOrderedOn] = useState(today);
  const [done, setDone] = useState(true);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const selectedIds = new Set(lines.map((l) => l.product.id));
  const total = lines.reduce(
    (sum, l) => sum + (Number(l.price) || 0) * (Number(l.quantity) || 0),
    0,
  );

  function toggleProduct(product: Product) {
    setLines((prev) =>
      prev.some((l) => l.product.id === product.id)
        ? prev.filter((l) => l.product.id !== product.id)
        : [...prev, newLine(product)],
    );
  }

  function patchLine(key: string, patch: Partial<DraftLine>) {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  }

  // Same product in another size/color — added right below the original.
  function duplicateLine(key: string) {
    setLines((prev) => {
      const index = prev.findIndex((l) => l.key === key);
      if (index === -1) return prev;
      const copy = { ...newLine(prev[index].product), price: prev[index].price };
      return [...prev.slice(0, index + 1), copy, ...prev.slice(index + 1)];
    });
  }

  function lineProblem(line: DraftLine): string | null {
    const quantity = Number(line.quantity);
    if (!Number.isInteger(quantity) || quantity < 1) return "Quantity must be at least 1";
    const price = Number(line.price);
    if (line.price.trim() === "" || !Number.isInteger(price) || price < 0) {
      return "Enter a price in whole GHS";
    }
    if (line.product.sizes.length > 0 && !line.size) return "Pick a size";
    if (line.product.colors.length > 0 && !line.color) return "Pick a color";
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (lines.length === 0) {
      toast.error("Add at least one product");
      return;
    }
    const firstProblem = lines.map(lineProblem).find(Boolean);
    if (firstProblem) {
      toast.error(firstProblem);
      return;
    }
    setSaving(true);
    try {
      // The picked day at the current time of day, so today's entries keep a
      // sensible order among themselves.
      const now = new Date();
      const [y, m, d] = orderedOn.split("-").map(Number);
      const orderedAt = new Date(y, m - 1, d, now.getHours(), now.getMinutes(), now.getSeconds());
      const order = await createManualOrder({
        customerName,
        customerContact,
        customerEmail,
        status: done ? "COMPLETED" : "CONFIRMED",
        orderedAt: (orderedAt > now ? now : orderedAt).toISOString(),
        note,
        items: lines.map((l) => ({
          productId: l.product.id,
          quantity: Number(l.quantity),
          price: Number(l.price),
          size: l.size || null,
          color: l.color || null,
        })),
      });
      toast.success("Order recorded");
      router.push(`/admin/orders/${order.id}`);
      router.refresh();
    } catch (err) {
      toast.error((err as Error).message || "Couldn't record this order");
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-w-3xl flex-col gap-7">
      <section>
        <Label>Products</Label>
        <p className="mt-1 text-xs text-muted-foreground">
          Search and tick what the customer bought. Stock is taken off when you save.
        </p>
        <div className="mt-2">
          <ProductPicker
            tenantId={tenantId}
            selectedIds={selectedIds}
            onToggle={toggleProduct}
            allowInactive
          />
        </div>

        {lines.length > 0 && (
          <ul className="mt-4 flex flex-col gap-2">
            {lines.map((line) => {
              const { product } = line;
              const hasOptions = product.sizes.length > 0 || product.colors.length > 0;
              return (
                <li key={line.key} className="rounded-lg border p-3">
                  <div className="flex items-center gap-3">
                    <ProductThumb product={product} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{product.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {product.trackStock ? `${product.stock} in stock` : "Always in stock"}
                      </p>
                    </div>
                    {hasOptions && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => duplicateLine(line.key)}
                        aria-label="Add another size or color"
                        title="Add another size or color"
                      >
                        <CopyPlus className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => setLines((prev) => prev.filter((l) => l.key !== line.key))}
                      aria-label="Remove"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <div>
                      <Label className="text-xs">Quantity</Label>
                      <Input
                        type="number"
                        inputMode="numeric"
                        min={1}
                        value={line.quantity}
                        onChange={(e) => patchLine(line.key, { quantity: e.target.value })}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Price each (GHS)</Label>
                      <Input
                        type="number"
                        inputMode="numeric"
                        min={0}
                        value={line.price}
                        onChange={(e) => patchLine(line.key, { price: e.target.value })}
                        className="mt-1"
                      />
                    </div>
                    {product.sizes.length > 0 && (
                      <div>
                        <Label className="text-xs">Size</Label>
                        <select
                          value={line.size}
                          onChange={(e) => patchLine(line.key, { size: e.target.value })}
                          className={`mt-1 ${selectClassName}`}
                        >
                          <option value="">Choose…</option>
                          {product.sizes.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                    {product.colors.length > 0 && (
                      <div>
                        <Label className="text-xs">Color</Label>
                        <select
                          value={line.color}
                          onChange={(e) => patchLine(line.key, { color: e.target.value })}
                          className={`mt-1 ${selectClassName}`}
                        >
                          <option value="">Choose…</option>
                          {product.colors.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <div>
          <Label htmlFor="customerName">Customer name</Label>
          <Input
            id="customerName"
            required
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            className="mt-1.5"
          />
        </div>
        <div>
          <Label htmlFor="customerContact">Phone (optional)</Label>
          <Input
            id="customerContact"
            type="tel"
            value={customerContact}
            onChange={(e) => setCustomerContact(e.target.value)}
            className="mt-1.5"
          />
        </div>
        <div>
          <Label htmlFor="customerEmail">Email (optional)</Label>
          <Input
            id="customerEmail"
            type="email"
            value={customerEmail}
            onChange={(e) => setCustomerEmail(e.target.value)}
            className="mt-1.5"
          />
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-[auto_1fr]">
        <div>
          <Label htmlFor="orderedOn">Date of sale</Label>
          <Input
            id="orderedOn"
            type="date"
            required
            max={today()}
            value={orderedOn}
            onChange={(e) => setOrderedOn(e.target.value)}
            className="mt-1.5 w-44"
          />
        </div>
        <div>
          <Label>Status</Label>
          <div className="mt-1.5 flex flex-wrap gap-2">
            <Button
              type="button"
              variant={done ? "default" : "outline"}
              onClick={() => setDone(true)}
              aria-pressed={done}
            >
              Paid &amp; delivered
            </Button>
            <Button
              type="button"
              variant={!done ? "default" : "outline"}
              onClick={() => setDone(false)}
              aria-pressed={!done}
            >
              Still to pay or deliver
            </Button>
          </div>
          <p className="mt-1.5 text-xs text-muted-foreground">
            {done
              ? "Saved as completed."
              : "Saved as confirmed. Mark it completed once it's paid and delivered."}
          </p>
        </div>
      </section>

      <div>
        <Label htmlFor="note">Note (optional)</Label>
        <Textarea
          id="note"
          rows={2}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="e.g. Sold at the pop-up, ordered on Instagram…"
          className="mt-1.5"
        />
      </div>

      <div className="flex flex-wrap items-center gap-4 border-t pt-5">
        <Button type="submit" disabled={saving} className="gap-2">
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          Record order
        </Button>
        <p className="text-sm">
          Total <span className="font-semibold">{formatMoney(total)}</span>
        </p>
        <p className="w-full text-xs text-muted-foreground">
          No emails are sent. The customer won&apos;t be notified.
        </p>
      </div>
    </form>
  );
}
