import { redirect } from "next/navigation";
import { getOrders } from "@/lib/api-server";
import { getMe } from "@/lib/get-me";
import { OrdersTable } from "@/components/admin/orders-table";

export const metadata = { title: "Orders" };

export default async function AdminOrdersPage() {
  const me = await getMe();
  if (!me) redirect("/admin/login");
  const orders = await getOrders(me.tenant.id);

  return (
    <div>
      <h1 className="text-2xl font-semibold">Orders</h1>
      <p className="text-sm text-muted-foreground">
        Order requests come in as Pending — confirm them to unlock payment for the customer.
      </p>
      <div className="mt-7">
        <OrdersTable tenant={me.tenant} orders={orders} />
      </div>
    </div>
  );
}
