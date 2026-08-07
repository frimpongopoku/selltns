import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getOrderByToken, getPaymentMethods, getProduct, getTenantBySlug } from "@/lib/api";
import { formatMoney, formatDateTime } from "@/lib/format";
import { StatusBadge } from "@/components/storefront/status-badge";
import { TrackerActions } from "@/components/storefront/order-tracker";
import { CopyValue } from "@/components/storefront/copy-value";
import { PaymentMethodCard } from "@/components/storefront/payment-method-card";
import { obscurePaymentMethodPhone, obscurePhone } from "@/lib/phone";
import type { Product } from "@/lib/types";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<Metadata> {
  const { token } = await params;
  const order = await getOrderByToken(token).catch(() => null);
  if (!order) return { title: "Order not found" };
  const summary = order.items.map((i) => `${i.quantity}x ${i.title}`).join(", ");
  return {
    title: `Order for ${order.customerName}, ${formatMoney(order.total)}`,
    description: `${summary} · Total ${formatMoney(order.total)}`,
    openGraph: {
      title: `Order for ${order.customerName}`,
      description: `${summary} · Total ${formatMoney(order.total)}`,
    },
    robots: { index: false, follow: true },
  };
}

export default async function TrackOrderPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string; token: string }>;
  searchParams: Promise<{ new?: string }>;
}) {
  const { slug, token } = await params;
  const { new: isNew } = await searchParams;
  const [order, tenant] = await Promise.all([
    getOrderByToken(token).catch(() => null),
    getTenantBySlug(slug).catch(() => null),
  ]);
  if (!order || !tenant) notFound();

  const [paymentMethods, itemProducts] = await Promise.all([
    getPaymentMethods(tenant.id),
    Promise.all(
      order.items.map((item) => getProduct(item.productId, tenant.id).catch(() => null)),
    ),
  ]);
  const productByItem = new Map<string, Product | null>(
    order.items.map((item, i) => [item.productId, itemProducts[i]]),
  );
  const showPayment = ["CONFIRMED", "MODIFIED", "COMPLETED"].includes(order.status);
  const enabledMethods = paymentMethods.filter((m) => m.isEnabled);

  return (
    <div className="mx-auto max-w-2xl animate-in fade-in-0 slide-in-from-bottom-2 px-4 py-12 duration-500 sm:px-6 sm:py-16 lg:px-8">
      {isNew === "1" && (
        <div className="store-card mb-7 animate-in zoom-in-95 bg-[color-mix(in_oklab,var(--store-accent)_15%,var(--store-bg))] p-4 text-sm duration-300">
          Order request submitted! Save this link. It&apos;s the only way to
          check your order status.
        </div>
      )}

      <div className="flex items-center justify-between gap-3">
        <h1 className="store-heading text-2xl font-semibold">Order tracking</h1>
        <StatusBadge status={order.status} />
      </div>
      <p className="store-muted mt-1.5 text-sm">Requested {formatDateTime(order.createdAt)}</p>

      <div className="store-card mt-7 divide-y divide-[var(--store-border)] p-5">
        {order.items.map((item) => {
          const product = productByItem.get(item.productId);
          const isLive = Boolean(product && product.isActive);
          const image = product?.images[0];

          const content = (
            <>
              <div className="store-card h-14 w-14 shrink-0 overflow-hidden bg-[var(--store-hover-bg)]">
                {image && (
                  <Image
                    src={image}
                    alt={item.title}
                    width={56}
                    height={56}
                    className="h-full w-full object-cover"
                  />
                )}
              </div>
              <div className="flex-1">
                <p className={isLive ? "transition-colors group-hover:text-[var(--store-primary)]" : ""}>
                  {item.title}
                </p>
                <p className="store-muted text-xs">Qty {item.quantity}</p>
              </div>
              <span className="text-sm font-medium">
                {formatMoney(item.priceAtOrder * item.quantity)}
              </span>
            </>
          );

          return (
            <div key={item.productId} className="flex items-center gap-3 py-3.5 text-sm">
              {isLive && product ? (
                <Link href={`/${slug}/products/${product.slug}`} className="group flex flex-1 items-center gap-3">
                  {content}
                </Link>
              ) : (
                <div className="flex flex-1 items-center gap-3">{content}</div>
              )}
            </div>
          );
        })}
        <div className="flex justify-between pt-3 font-semibold">
          <span>Total</span>
          <span>{formatMoney(order.total)}</span>
        </div>
      </div>

      <div className="mt-9">
        <h2 className="store-heading text-lg font-semibold">Status history</h2>
        <ol className="mt-5 flex flex-col gap-5 border-l border-[var(--store-border)] pl-5">
          {order.history.map((entry, i) => (
            <li key={i} className="relative">
              <span className="absolute -left-[23px] top-1 h-2.5 w-2.5 rounded-full bg-[var(--store-primary)]" />
              <p className="text-sm font-medium">{entry.note}</p>
              <p className="store-muted text-xs">{formatDateTime(entry.at)}</p>
            </li>
          ))}
        </ol>
      </div>

      {showPayment && (
        <div className="mt-9 animate-in fade-in-0 slide-in-from-bottom-1 duration-500">
          <h2 className="store-heading text-lg font-semibold">Payment options</h2>
          <p className="store-muted mt-1.5 text-sm">
            Your order is confirmed. Pay using one of the options below.
          </p>

          <div className="store-card mt-4 flex items-center justify-between gap-3 p-4">
            <div>
              <p className="store-muted text-xs">Payment reference</p>
              <p className="font-medium">Include this note with your payment</p>
            </div>
            <span className="store-accent-text font-mono text-sm font-semibold">
              <CopyValue value={order.paymentReference} label="Reference" />
            </span>
          </div>

          <Link
            href={`/${slug}/pay`}
            className="store-btn-primary mt-4 flex items-center justify-center py-3.5 text-sm font-medium"
          >
            Pay now on {tenant.name}&apos;s payment page
          </Link>

          <div className="mt-4 flex flex-col gap-3">
            {enabledMethods.map((method) => (
              <PaymentMethodCard key={method.id} method={obscurePaymentMethodPhone(method)} />
            ))}
          </div>
        </div>
      )}

      <div className="mt-10">
        <TrackerActions
          order={order}
          tenant={{ ...tenant, whatsappNumber: null }}
          whatsappNumberEncoded={tenant.whatsappNumber ? obscurePhone(tenant.whatsappNumber) : null}
        />
      </div>
    </div>
  );
}
