"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { useCart } from "@/components/storefront/cart-provider";
import { createOrder } from "@/lib/api";
import { formatMoney } from "@/lib/format";

export default function CheckoutPage() {
  const { lines, total, clear } = useCart();
  const router = useRouter();
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (lines.length === 0) {
    return (
      <div className="mx-auto max-w-2xl animate-in fade-in-0 px-4 py-24 text-center duration-500 sm:px-6">
        <h1 className="store-heading text-2xl font-semibold">Nothing to request yet</h1>
        <p className="store-muted mt-3">Your cart is empty.</p>
        <Link href="/" className="store-btn-primary mt-7 inline-block px-6 py-3 text-sm font-medium">
          Continue shopping
        </Link>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const order = await createOrder({
        customerName: name,
        customerContact: contact,
        items: lines.map((l) => ({
          productId: l.productId,
          title: l.title,
          quantity: l.quantity,
          priceAtOrder: l.price,
        })),
      });
      clear();
      router.push(`/track/${order.trackingToken}?new=1`);
    } catch {
      setError("Couldn't submit your order request. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl animate-in fade-in-0 slide-in-from-bottom-2 px-4 py-12 duration-500 sm:px-6 sm:py-16 lg:px-8">
      <h1 className="store-heading text-3xl font-semibold">Review your order request</h1>
      <p className="store-muted mt-3 max-w-md leading-relaxed">
        No payment yet — confirm your details and we&apos;ll review your
        order. You&apos;ll get a link to track its status and pay once it&apos;s
        confirmed.
      </p>

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
        {error && (
          <p className="animate-in fade-in-0 slide-in-from-top-1 text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={submitting}
          className="store-btn-primary mt-2 flex items-center justify-center gap-2 py-3.5 text-base font-medium disabled:opacity-60"
        >
          {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {submitting ? "Submitting…" : "Submit order request"}
        </button>
      </form>
    </div>
  );
}
