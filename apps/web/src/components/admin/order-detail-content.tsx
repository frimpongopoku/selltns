"use client";

import { useState } from "react";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { formatMoney, formatDateTime } from "@/lib/format";
import { StatusBadge } from "@/components/storefront/status-badge";
import { OrderActions } from "@/components/admin/order-actions";
import { Card } from "@/components/ui/card";
import type { Order } from "@/lib/types";

export function OrderDetailContent({
  order: initialOrder,
  showOpenFullPage = false,
  onUpdated,
}: {
  order: Order;
  showOpenFullPage?: boolean;
  onUpdated?: (order: Order) => void;
}) {
  const [order, setOrder] = useState(initialOrder);

  function handleUpdated(updated: Order) {
    setOrder(updated);
    onUpdated?.(updated);
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{order.customerName}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{order.customerContact}</p>
        </div>
        <StatusBadge status={order.status} />
      </div>

      {showOpenFullPage && (
        <Link
          href={`/admin/orders/${order.id}`}
          className="mt-3 inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          <ExternalLink className="h-3 w-3" />
          Open full page
        </Link>
      )}

      <Card className="mt-6 divide-y p-0">
        {order.items.map((item) => (
          <div key={item.productId} className="flex justify-between px-5 py-3.5 text-sm">
            <span>
              {item.title} <span className="text-muted-foreground">× {item.quantity}</span>
            </span>
            <span>{formatMoney(item.priceAtOrder * item.quantity)}</span>
          </div>
        ))}
        <div className="flex justify-between px-5 py-3.5 font-medium">
          <span>Total</span>
          <span>{formatMoney(order.total)}</span>
        </div>
      </Card>

      <div className="mt-6">
        <OrderActions order={order} onUpdated={handleUpdated} />
      </div>

      <div className="mt-8">
        <h2 className="font-medium">History</h2>
        <ol className="mt-4 flex flex-col gap-4 border-l pl-4">
          {order.history.map((entry, i) => (
            <li key={i} className="relative animate-in fade-in-0 slide-in-from-left-1 duration-300">
              <span className="absolute -left-[19px] top-1 h-2 w-2 rounded-full bg-primary" />
              <p className="text-sm">{entry.note}</p>
              <p className="text-xs text-muted-foreground">{formatDateTime(entry.at)}</p>
            </li>
          ))}
        </ol>
      </div>

      <p className="mt-8 text-xs text-muted-foreground">
        Customer tracking link: <span className="font-mono">/track/{order.trackingToken}</span>
      </p>
    </div>
  );
}
