import { getPaymentMethods } from "@/lib/api";
import { PaymentMethodsManager } from "@/components/admin/payment-methods-manager";

export const metadata = { title: "Payment methods" };

export default async function AdminPaymentsPage() {
  const methods = await getPaymentMethods();

  return (
    <div>
      <h1 className="text-2xl font-semibold">Payment methods</h1>
      <div className="mt-7">
        <PaymentMethodsManager methods={methods} />
      </div>
    </div>
  );
}
