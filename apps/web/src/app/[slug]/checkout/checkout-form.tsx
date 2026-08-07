"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useCart } from "@/components/storefront/cart-provider";
import { useStoreSlug } from "@/components/storefront/store-context";
import { createOrder } from "@/lib/api";
import { formatMoney } from "@/lib/format";

export function CheckoutForm({ tenantId }: { tenantId: string }) {
  const { lines, total, clear } = useCart();
  const slug = useStoreSlug();
  const router = useRouter();
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [email, setEmail] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (lines.length === 0) {
    return (
      <div className="mx-auto max-w-2xl animate-in fade-in-0 px-4 py-24 text-center duration-500 sm:px-6">
        <h1 className="store-heading text-2xl font-semibold">Nothing to request yet</h1>
        <p className="store-muted mt-3">Your cart is empty.</p>
        <Link href={`/${slug}`} className="store-btn-primary mt-7 inline-block px-6 py-3 text-sm font-medium">
          Continue shopping
        </Link>
      </div>
    );
  }

  const preorderLine = lines.find((l) => l.preorderCollectionId);
  const isPreorder = !!preorderLine;
  const depositAmount = isPreorder
    ? preorderLine.preorderDepositType === "FULL"
      ? total
      : Math.round((total * (preorderLine.preorderDepositPercentage ?? 100)) / 100)
    : total;
  const balanceAmount = total - depositAmount;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const order = await createOrder({
        tenantId,
        customerName: name,
        customerContact: contact,
        customerEmail: email,
        whatsappNumber: isPreorder ? whatsappNumber : undefined,
        deliveryAddress: isPreorder ? deliveryAddress : undefined,
        items: lines.map((l) => ({
          productId: l.productId,
          quantity: l.quantity,
        })),
      });
      clear();
      router.push(`/${slug}/track/${order.trackingToken}?new=1`);
    } catch {
      toast.error("Couldn't submit your order request. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl animate-in fade-in-0 slide-in-from-bottom-2 px-4 py-12 duration-500 sm:px-6 sm:py-16 lg:px-8">
      <h1 className="store-heading text-3xl font-semibold">
        {isPreorder ? "Review your pre-order" : "Review your order request"}
      </h1>
      <p className="store-muted mt-3 max-w-md leading-relaxed">
        {isPreorder
          ? `This is a pre-order. Once confirmed, you'll pay ${
              preorderLine.preorderDepositType === "FULL" ? "the full amount" : "a deposit"
            } now, and the rest (if any) once it's ready.`
          : "No payment yet. Confirm your details and we'll review your order. You'll get a link to track its status and pay once it's confirmed."}
      </p>
      {isPreorder && preorderLine.preorderFulfillmentNote && (
        <p className="store-muted mt-2 max-w-md text-sm leading-relaxed">
          {preorderLine.preorderFulfillmentNote}
        </p>
      )}

      <div className="store-card mt-8 divide-y divide-[var(--store-border)] p-5">
        {lines.map((line) => (
          <div key={line.productId} className="flex items-center justify-between py-3 text-sm">
            <span>
              {line.title} <span className="store-muted">× {line.quantity}</span>
            </span>
            <span className="font-medium">{formatMoney(line.price * line.quantity)}</span>
          </div>
        ))}
        <div className="flex items-center justify-between pt-3">
          <span className="store-heading text-base font-semibold">Total</span>
          <span className="store-heading text-base font-semibold">{formatMoney(total)}</span>
        </div>
        {isPreorder && (
          <div className="flex flex-col gap-1.5 pt-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="store-muted">
                Due now{preorderLine.preorderDepositType === "PERCENTAGE" ? ` (${preorderLine.preorderDepositPercentage}%)` : ""}
              </span>
              <span className="store-accent-text font-medium">{formatMoney(depositAmount)}</span>
            </div>
            {balanceAmount > 0 && (
              <div className="flex items-center justify-between">
                <span className="store-muted">Due later</span>
                <span className="store-muted">{formatMoney(balanceAmount)}</span>
              </div>
            )}
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-5">
        <div>
          <label htmlFor="name" className="store-label">Full name</label>
          <input
            id="name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Naa Adjeley"
            className="store-input mt-1.5"
          />
        </div>
        <div>
          <label htmlFor="contact" className="store-label">Phone or WhatsApp number</label>
          <input
            id="contact"
            required
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            placeholder="055 234 1122"
            className="store-input mt-1.5"
          />
        </div>
        <div>
          <label htmlFor="email" className="store-label">Email</label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="store-input mt-1.5"
          />
          <p className="store-muted mt-1.5 text-xs">
            We&apos;ll email you a link to track your order. No account needed.
          </p>
        </div>
        {isPreorder && (
          <>
            <div>
              <label htmlFor="whatsapp" className="store-label">WhatsApp number</label>
              <input
                id="whatsapp"
                required
                value={whatsappNumber}
                onChange={(e) => setWhatsappNumber(e.target.value)}
                placeholder="055 234 1122"
                className="store-input mt-1.5"
              />
              <p className="store-muted mt-1.5 text-xs">
                Pre-orders take longer, so we&apos;ll use this to keep you posted.
              </p>
            </div>
            <div>
              <label htmlFor="deliveryAddress" className="store-label">Delivery address</label>
              <textarea
                id="deliveryAddress"
                required
                rows={2}
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
                placeholder="House number, street, town"
                className="store-input mt-1.5"
              />
            </div>
          </>
        )}
        <button
          type="submit"
          disabled={submitting}
          className="store-btn-primary mt-2 flex items-center justify-center gap-2 py-3.5 text-base font-medium disabled:opacity-60"
        >
          {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {submitting ? "Submitting…" : isPreorder ? "Submit pre-order request" : "Submit order request"}
        </button>
      </form>
    </div>
  );
}
