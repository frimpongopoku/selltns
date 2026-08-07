"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, PackageSearch } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { addOrderUpdate, markOrderBalancePaid, requestOrderBalance } from "@/lib/api";
import { formatMoney } from "@/lib/format";
import type { Order } from "@/lib/types";

export function PreorderActions({
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
  const [note, setNote] = useState("");

  if (order.type !== "PREORDER") return null;

  async function run(action: () => Promise<Order>, successMessage: string) {
    setBusy(true);
    try {
      const updated = await action();
      toast.success(successMessage);
      onUpdated?.(updated);
      router.refresh();
    } catch {
      toast.error("Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  async function handlePostUpdate() {
    if (!note.trim()) return;
    await run(
      () => addOrderUpdate(order.id, tenantId, note.trim()),
      "Update sent to customer",
    );
    setNote("");
  }

  const canRequestBalance =
    !order.balancePaid &&
    !order.balanceRequestedAt &&
    (order.balanceAmount ?? 0) > 0 &&
    ["CONFIRMED", "MODIFIED", "COMPLETED"].includes(order.status);
  const canMarkPaid = !order.balancePaid && !!order.balanceRequestedAt;

  return (
    <Card className="mt-6 p-5">
      <div className="flex items-center gap-2">
        <PackageSearch className="h-4 w-4 text-muted-foreground" />
        <h2 className="font-medium">Pre-order</h2>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-y-2 text-sm">
        <dt className="text-muted-foreground">Deposit due now</dt>
        <dd className="text-right">{formatMoney(order.depositAmount ?? 0)}</dd>
        <dt className="text-muted-foreground">Balance due later</dt>
        <dd className="text-right">
          {formatMoney(order.balanceAmount ?? 0)}
          {order.balancePaid ? (
            <span className="ml-1.5 text-xs text-emerald-600 dark:text-emerald-400">Paid</span>
          ) : order.balanceRequestedAt ? (
            <span className="ml-1.5 text-xs text-amber-600 dark:text-amber-400">Requested</span>
          ) : null}
        </dd>
        {order.whatsappNumber && (
          <>
            <dt className="text-muted-foreground">WhatsApp</dt>
            <dd className="text-right">{order.whatsappNumber}</dd>
          </>
        )}
        {order.deliveryAddress && (
          <>
            <dt className="text-muted-foreground">Delivery address</dt>
            <dd className="text-right">{order.deliveryAddress}</dd>
          </>
        )}
      </dl>

      <div className="mt-4 flex flex-wrap gap-2">
        {canRequestBalance && (
          <Button
            size="sm"
            variant="outline"
            disabled={busy}
            className="gap-2"
            onClick={() =>
              run(() => requestOrderBalance(order.id, tenantId), "Balance payment requested")
            }
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            Request balance payment
          </Button>
        )}
        {canMarkPaid && (
          <Button
            size="sm"
            disabled={busy}
            className="gap-2"
            onClick={() =>
              run(() => markOrderBalancePaid(order.id, tenantId), "Balance marked as paid")
            }
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            Mark balance received
          </Button>
        )}
      </div>

      <div className="mt-5 border-t pt-4">
        <label htmlFor="preorder-update" className="text-sm font-medium">
          Post an update
        </label>
        <p className="mt-1 text-xs text-muted-foreground">
          Emailed to the customer immediately, e.g. &quot;Fabric sourced&quot; or &quot;Shipped from supplier&quot;.
        </p>
        <Textarea
          id="preorder-update"
          rows={2}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="What's the latest?"
          className="mt-2"
        />
        <Button size="sm" className="mt-2 gap-2" disabled={busy || !note.trim()} onClick={handlePostUpdate}>
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          Post update
        </Button>
      </div>
    </Card>
  );
}
