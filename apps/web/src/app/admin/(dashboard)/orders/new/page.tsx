import { redirect } from "next/navigation";
import { getMe } from "@/lib/get-me";
import { ManualOrderForm } from "@/components/admin/manual-order-form";

export const metadata = { title: "Record an order" };

export default async function NewOrderPage() {
  const me = await getMe();
  if (!me) redirect("/admin/login");

  return (
    <div>
      <h1 className="text-2xl font-semibold">Record an order</h1>
      <p className="text-sm text-muted-foreground">
        For sales made outside your storefront (in person, by phone, in DMs), so they count
        toward your sales and stock.
      </p>
      <div className="mt-7">
        <ManualOrderForm tenantId={me.tenant.id} />
      </div>
    </div>
  );
}
