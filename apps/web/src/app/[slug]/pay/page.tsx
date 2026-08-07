import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getPaymentMethods, getTenantBySlug } from "@/lib/api";
import { PaymentMethodCard } from "@/components/storefront/payment-method-card";
import { obscurePaymentMethodPhone } from "@/lib/phone";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const tenant = await getTenantBySlug(slug).catch(() => null);
  if (!tenant) return { title: "Store not found" };
  const title = `Pay ${tenant.name}`;
  const description = `Send a Mobile Money or bank payment to ${tenant.name}.`;
  return {
    title,
    description,
    openGraph: { title, description },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function PayPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const tenant = await getTenantBySlug(slug).catch(() => null);
  if (!tenant) notFound();

  const methods = (await getPaymentMethods(tenant.id))
    .filter((m) => m.isEnabled)
    .sort((a, b) => Number(b.isPreferred) - Number(a.isPreferred));

  return (
    <div className="mx-auto max-w-md px-4 py-14 sm:py-20">
      <div className="text-center">
        <h1 className="store-heading text-2xl font-semibold sm:text-3xl">{tenant.name}</h1>
        <p className="store-muted mt-2 text-sm">Choose a way to pay</p>
      </div>

      {methods.length === 0 ? (
        <p className="store-muted mt-10 text-center text-sm">
          No payment methods are set up yet — check back soon.
        </p>
      ) : (
        <div className="mt-9 flex flex-col gap-4">
          {methods.map((method) => (
            <PaymentMethodCard key={method.id} method={obscurePaymentMethodPhone(method)} />
          ))}
        </div>
      )}

      <p className="store-muted mt-10 text-center text-xs leading-relaxed">
        Always confirm the recipient name matches {tenant.name} before sending a payment.
      </p>
    </div>
  );
}
