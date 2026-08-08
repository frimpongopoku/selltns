import { notFound, redirect } from "next/navigation";
import { getOrder } from "@/lib/api-server";
import { getMe } from "@/lib/get-me";
import { OrderDetailContent } from "@/components/admin/order-detail-content";

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const me = await getMe();
  if (!me) redirect("/admin/login");
  const order = await getOrder(id, me.tenant.id).catch(() => null);
  if (!order) notFound();

  return (
    <div className="max-w-2xl animate-in fade-in-0 slide-in-from-bottom-1 duration-300">
      <OrderDetailContent tenant={me.tenant} order={order} />
    </div>
  );
}
