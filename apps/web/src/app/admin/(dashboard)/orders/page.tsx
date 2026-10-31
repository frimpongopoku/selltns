import { redirect } from "next/navigation";
import { getOrders } from "@/lib/api-server";
import { getMe } from "@/lib/get-me";
import Link from "next/link";
import { Plus } from "lucide-react";
import { OrdersTable } from "@/components/admin/orders-table";
import { buttonVariants } from "@/components/ui/button";

export const metadata = { title: "Orders" };

export default async function AdminOrdersPage() {
  const me = await getMe();
  if (!me) redirect("/admin/login");
  const orders = await getOrders(me.tenant.id);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Orders</h1>
          <p className="text-sm text-muted-foreground">
            Order requests come in as Pending — confirm them to unlock payment for the customer.
          </p>
        </div>
        <Link href="/admin/orders/new" className={buttonVariants({ className: "gap-1.5" })}>
          <Plus className="h-4 w-4" />
          Record an order
        </Link>
      </div>
      <div className="mt-7">
        <OrdersTable tenant={me.tenant} orders={orders} />
      </div>
    </div>
  );
}
