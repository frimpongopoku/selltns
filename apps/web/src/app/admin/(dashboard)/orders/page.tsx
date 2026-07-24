import { getOrders } from "@/lib/api";
import { OrdersTable } from "@/components/admin/orders-table";

export const metadata = { title: "Orders" };

export default async function AdminOrdersPage() {
  const orders = await getOrders();

  return (
    <div>
      <h1 className="text-2xl font-semibold">Orders</h1>
      <p className="text-sm text-muted-foreground">
        Order requests come in as Pending — confirm them to unlock payment for the customer.
      </p>
      <div className="mt-7">
        <OrdersTable orders={orders} />
      </div>
    </div>
  );
}
