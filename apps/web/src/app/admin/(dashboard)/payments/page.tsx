import { redirect } from "next/navigation";
import { getPaymentMethods } from "@/lib/api";
import { getMe } from "@/lib/get-me";
import { PaymentMethodsManager } from "@/components/admin/payment-methods-manager";

export const metadata = { title: "Payment methods" };

export default async function AdminPaymentsPage() {
  const me = await getMe();
  if (!me) redirect("/admin/login");
  const methods = await getPaymentMethods(me.tenant.id);

  return (
    <div>
      <h1 className="text-2xl font-semibold">Payment methods</h1>
      <div className="mt-7">
        <PaymentMethodsManager tenantId={me.tenant.id} methods={methods} />
      </div>
    </div>
  );
}
