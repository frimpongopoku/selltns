"use client";

import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "@/components/storefront/status-badge";
import { OrderDetailContent } from "@/components/admin/order-detail-content";
import { formatMoney, formatDate } from "@/lib/format";
import type { Order, OrderStatus, Tenant } from "@/lib/types";

const TABS: { value: OrderStatus | "ALL"; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "PENDING", label: "Pending" },
  { value: "CONFIRMED", label: "Confirmed" },
  { value: "MODIFIED", label: "Modified" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
];

export function OrdersTable({
  tenant,
  orders: initialOrders,
}: {
  tenant: Tenant;
  orders: Order[];
}) {
  const [orders, setOrders] = useState(initialOrders);
  const [tab, setTab] = useState<OrderStatus | "ALL">("ALL");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const filtered = tab === "ALL" ? orders : orders.filter((o) => o.status === tab);
  const selected = orders.find((o) => o.id === selectedId) ?? null;

  function handleUpdated(updated: Order) {
    setOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
  }

  return (
    <>
      <Tabs value={tab} onValueChange={(v) => setTab(v as OrderStatus | "ALL")}>
        <TabsList className="flex-wrap">
          {TABS.map((t) => (
            <TabsTrigger key={t.value} value={t.value}>
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value={tab}>
          <Card className="mt-4 p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((order) => (
                    <TableRow
                      key={order.id}
                      onClick={() => setSelectedId(order.id)}
                      className="cursor-pointer"
                    >
                      <TableCell className="font-medium">
                        <span className="inline-flex items-center gap-2">
                          {!order.seenByAdminAt && (
                            <span
                              title="New — not yet opened"
                              className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary"
                            />
                          )}
                          {order.customerName}
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{order.customerContact}</TableCell>
                      <TableCell className="text-muted-foreground">{order.items.length}</TableCell>
                      <TableCell>{formatMoney(order.total)}</TableCell>
                      <TableCell>
                        <span className="inline-flex items-center gap-1.5">
                          <StatusBadge status={order.status} />
                          {order.type === "PREORDER" && (
                            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                              Pre-order
                            </span>
                          )}
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{formatDate(order.createdAt)}</TableCell>
                    </TableRow>
                  ))}
                  {filtered.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                        No orders in this status.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      <Sheet open={selected !== null} onOpenChange={(open) => !open && setSelectedId(null)}>
        <SheetContent
          side="right"
          className="w-full gap-0 overflow-y-auto p-6 data-[side=right]:sm:max-w-lg"
        >
          <SheetTitle className="sr-only">Order details</SheetTitle>
          {selected && (
            <OrderDetailContent
              key={selected.id}
              tenant={tenant}
              order={selected}
              showOpenFullPage
              onUpdated={handleUpdated}
            />
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
