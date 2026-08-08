import Link from "next/link";
import { redirect } from "next/navigation";
import { ClipboardList, Package, Wallet, TrendingUp } from "lucide-react";
import { getOrders, getProducts } from "@/lib/api";
import { getMe } from "@/lib/get-me";
import { StatCard } from "@/components/admin/stat-card";
import { StatusBadge } from "@/components/storefront/status-badge";
import { formatMoney, formatDate } from "@/lib/format";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const metadata = { title: "Dashboard" };

export default async function AdminDashboardPage() {
  const me = await getMe();
  if (!me) redirect("/admin/login");
  const [orders, products] = await Promise.all([
    getOrders(me.tenant.id),
    getProducts(me.tenant.id),
  ]);

  const pending = orders.filter((o) => o.status === "PENDING").length;
  const confirmed = orders.filter((o) => ["CONFIRMED", "MODIFIED"].includes(o.status)).length;
  const completedTotal = orders
    .filter((o) => o.status === "COMPLETED")
    .reduce((sum, o) => sum + o.total, 0);
  const activeProducts = products.filter((p) => p.isActive).length;

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Here&apos;s what&apos;s happening with your store.
          </p>
        </div>
      </div>

      <div className="mt-7 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            label: "Pending order requests",
            value: String(pending),
            icon: <ClipboardList className="h-5 w-5" />,
            hint: "Need review",
          },
          {
            label: "Confirmed / awaiting payment",
            value: String(confirmed),
            icon: <Wallet className="h-5 w-5" />,
          },
          {
            label: "Completed revenue",
            value: formatMoney(completedTotal),
            icon: <TrendingUp className="h-5 w-5" />,
          },
          {
            label: "Active products",
            value: String(activeProducts),
            icon: <Package className="h-5 w-5" />,
            hint: `${products.length} total`,
          },
        ].map((stat, i) => (
          <div
            key={stat.label}
            style={{ animationDelay: `${i * 60}ms` }}
            className="animate-in fade-in-0 slide-in-from-bottom-1 fill-mode-both duration-300"
          >
            <StatCard {...stat} />
          </div>
        ))}
      </div>

      <Card className="mt-9 p-0">
        <div className="flex items-center justify-between border-b p-5">
          <h2 className="font-medium">Recent order requests</h2>
          <Link href="/admin/orders" className="text-sm text-primary hover:underline">
            View all
          </Link>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.slice(0, 5).map((order, i) => (
                <TableRow
                  key={order.id}
                  style={{ animationDelay: `${i * 50}ms` }}
                  className="animate-in fade-in-0 fill-mode-both cursor-pointer duration-300"
                >
                  <TableCell>
                    <Link href={`/admin/orders/${order.id}`} className="hover:underline">
                      {order.customerName}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {order.items.length} item{order.items.length > 1 ? "s" : ""}
                  </TableCell>
                  <TableCell>{formatMoney(order.total)}</TableCell>
                  <TableCell>
                    <StatusBadge status={order.status} />
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(order.createdAt)}
                  </TableCell>
                </TableRow>
              ))}
              {orders.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                    No order requests yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
