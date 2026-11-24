"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ExternalLink, ImageOff } from "lucide-react";
import { getCanonicalUrl } from "@/lib/canonical";
import { formatMoney, formatDateTime } from "@/lib/format";
import { itemOptionsLabel } from "@/lib/item-options";
import { StatusBadge } from "@/components/storefront/status-badge";
import { OrderActions } from "@/components/admin/order-actions";
import { PreorderActions } from "@/components/admin/preorder-actions";
import { Card } from "@/components/ui/card";
import { markOrderSeen } from "@/lib/api";
import type { Order, Tenant } from "@/lib/types";

export function OrderDetailContent({
  tenant,
  order: initialOrder,
  showOpenFullPage = false,
  onUpdated,
}: {
  tenant: Tenant;
  order: Order;
  showOpenFullPage?: boolean;
  onUpdated?: (order: Order) => void;
}) {
  const [order, setOrder] = useState(initialOrder);

  useEffect(() => {
    if (order.seenByAdminAt) return;
    markOrderSeen(order.id, tenant.id).then((updated) => {
      setOrder(updated);
      onUpdated?.(updated);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order.id]);

  const trackingUrl = getCanonicalUrl(tenant, `/track/${order.trackingToken}`);

  function handleUpdated(updated: Order) {
    setOrder(updated);
    onUpdated?.(updated);
  }

  return (
    <div>
      <div className="flex flex-col gap-2 pr-8">
        <h1 className="text-2xl font-semibold break-words">{order.customerName}</h1>
        <p className="text-sm text-muted-foreground">{order.customerContact}</p>
        <div className="flex flex-wrap items-center gap-2">
          {order.type === "PREORDER" && (
            <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800 dark:bg-amber-950 dark:text-amber-300">
              Pre-order
            </span>
          )}
          <StatusBadge status={order.status} />
        </div>
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
        {order.items.map((item, index) => (
          <div key={index} className="flex items-center gap-3 px-4 py-3 text-sm">
            <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-md bg-muted">
              {item.image ? (
                <Image
                  src={item.image}
                  alt=""
                  fill
                  sizes="56px"
                  className="object-cover"
                  style={item.imageFocus ? { objectPosition: item.imageFocus } : undefined}
                />
              ) : (
                <ImageOff className="absolute inset-0 m-auto h-4 w-4 text-muted-foreground" />
              )}
            </div>
            <span className="min-w-0 flex-1 break-words">
              {item.title}
              {itemOptionsLabel(item) && (
                <span className="font-medium"> ({itemOptionsLabel(item)})</span>
              )}{" "}
              <span className="whitespace-nowrap text-muted-foreground">× {item.quantity}</span>
            </span>
            <span className="shrink-0 tabular-nums">
              {formatMoney(item.priceAtOrder * item.quantity)}
            </span>
          </div>
        ))}
        <div className="flex justify-between px-5 py-3.5 font-medium">
          <span>Total</span>
          <span>{formatMoney(order.total)}</span>
        </div>
      </Card>

      <div className="mt-6">
        <OrderActions tenantId={tenant.id} order={order} onUpdated={handleUpdated} />
      </div>

      <PreorderActions tenantId={tenant.id} order={order} onUpdated={handleUpdated} />

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

      <a
        href={trackingUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-8 flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
      >
        <ExternalLink className="h-3 w-3 shrink-0" />
        <span>Customer&apos;s order page:</span>
        <span className="min-w-0 truncate font-mono underline underline-offset-2">{trackingUrl}</span>
      </a>
    </div>
  );
}
