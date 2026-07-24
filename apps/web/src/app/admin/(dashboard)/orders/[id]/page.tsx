import { notFound } from "next/navigation";
import { getOrder } from "@/lib/api";
import { OrderDetailContent } from "@/components/admin/order-detail-content";

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const order = await getOrder(id).catch(() => null);
  if (!order) notFound();

  return (
    <div className="max-w-2xl animate-in fade-in-0 slide-in-from-bottom-1 duration-300">
      <OrderDetailContent order={order} />
    </div>
  );
}
