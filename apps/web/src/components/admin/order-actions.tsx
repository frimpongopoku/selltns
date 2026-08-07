"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { modifyOrderItems, updateOrderStatus } from "@/lib/api";
import type { Order, OrderStatus } from "@/lib/types";

export function OrderActions({
  tenantId,
  order,
  onUpdated,
}: {
  tenantId: string;
  order: Order;
  onUpdated?: (order: Order) => void;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [modifyOpen, setModifyOpen] = useState(false);
  const [quantities, setQuantities] = useState<Record<string, number>>(
    Object.fromEntries(order.items.map((i) => [i.productId, i.quantity])),
  );

  async function setStatus(status: OrderStatus, note?: string) {
    setBusy(true);
    try {
      const updated = await updateOrderStatus(order.id, tenantId, status, note);
      toast.success(`Order marked ${status.toLowerCase()}`);
      onUpdated?.(updated);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  const willNewlyConfirm = order.status === "PENDING";

  async function submitModification() {
    setBusy(true);
    try {
      const items = order.items.map((i) => ({ ...i, quantity: quantities[i.productId] }));
      const updated = await modifyOrderItems(order.id, tenantId, items, "Quantities updated by admin");
      toast.success(
        willNewlyConfirm
          ? "Order modified and confirmed — customer notified"
          : "Order modified — customer notified",
      );
      onUpdated?.(updated);
      setModifyOpen(false);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {order.status === "PENDING" && (
        <Button disabled={busy} className="gap-2" onClick={() => setStatus("CONFIRMED", "Confirmed by admin — ready for payment")}>
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          Confirm order
        </Button>
      )}
      {["CONFIRMED", "MODIFIED"].includes(order.status) && (
        <Button disabled={busy} className="gap-2" onClick={() => setStatus("COMPLETED", "Payment received, order fulfilled")}>
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          Mark completed
        </Button>
      )}
      {["PENDING", "CONFIRMED", "MODIFIED"].includes(order.status) && (
        <>
          <Button variant="outline" disabled={busy} onClick={() => setModifyOpen(true)}>
            Modify order
          </Button>
          <Button
            variant="destructive"
            disabled={busy}
            onClick={() => setStatus("CANCELLED", "Cancelled by admin")}
          >
            Cancel
          </Button>
        </>
      )}

      <Dialog open={modifyOpen} onOpenChange={setModifyOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modify order quantities</DialogTitle>
            <DialogDescription>
              {willNewlyConfirm
                ? "Saving will also confirm this order — the customer will be emailed and their payment page unlocked."
                : "The customer will be emailed the updated items and total."}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            {order.items.map((item) => (
              <div key={item.productId} className="flex items-center justify-between gap-3">
                <span className="text-sm">{item.title}</span>
                <Input
                  type="number"
                  min={0}
                  className="w-20"
                  value={quantities[item.productId]}
                  onChange={(e) =>
                    setQuantities((q) => ({ ...q, [item.productId]: Number(e.target.value) }))
                  }
                />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button disabled={busy} className="gap-2" onClick={submitModification}>
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              {willNewlyConfirm ? "Save & confirm order" : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
