"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Download, Loader2, Share2, XCircle } from "lucide-react";
import { updateOrderStatus } from "@/lib/api";
import type { Order, Tenant } from "@/lib/types";
import { formatMoney } from "@/lib/format";
import { waLink } from "@/lib/phone";
import { useRevealedPhone } from "@/lib/use-revealed-phone";

export function TrackerActions({
  order,
  tenant,
  whatsappNumberEncoded,
}: {
  order: Order;
  tenant: Tenant;
  whatsappNumberEncoded: string | null;
}) {
  const router = useRouter();
  const [cancelling, setCancelling] = useState(false);
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const whatsappNumber = useRevealedPhone(whatsappNumberEncoded);

  const shareText = `Hi ${tenant.name}, here's my order:\n${order.items
    .map((i) => `${i.quantity}x ${i.title}`)
    .join(", ")}\nTotal: ${formatMoney(order.total)}\nDetails: ${
    typeof window !== "undefined" ? window.location.href : ""
  }`;
  const whatsappUrl = whatsappNumber
    ? waLink(whatsappNumber, shareText)
    : `https://wa.me/?text=${encodeURIComponent(shareText)}`;

  async function handleCancel() {
    setCancelling(true);
    try {
      await updateOrderStatus(order.id, tenant.id, "CANCELLED", "Cancelled by customer");
      toast.success("Order request cancelled");
      router.refresh();
    } catch {
      toast.error("Couldn't cancel your order. Please try again.");
    } finally {
      setCancelling(false);
      setConfirmingCancel(false);
    }
  }

  return (
    <div className="flex flex-wrap gap-3">
      <button
        type="button"
        onClick={() => toast.info("PDF booklet generation is coming soon. This is a mock action.")}
        className="store-btn-secondary inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium"
      >
        <Download className="h-4 w-4" />
        Download PDF booklet
      </button>
      <button
        type="button"
        onClick={() => window.open(whatsappUrl, "_blank")}
        className="store-btn-secondary inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium"
      >
        <Share2 className="h-4 w-4" />
        {whatsappNumber ? `Send to ${tenant.name} on WhatsApp` : "Share to WhatsApp"}
      </button>
      {order.status === "PENDING" && (
        <>
          {confirmingCancel ? (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Cancel this request?</span>
              <button
                type="button"
                disabled={cancelling}
                onClick={handleCancel}
                className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-red-600 underline-offset-2 hover:underline disabled:opacity-60 dark:text-red-400"
              >
                {cancelling && <Loader2 className="h-4 w-4 animate-spin" />}
                Yes, cancel it
              </button>
              <button
                type="button"
                disabled={cancelling}
                onClick={() => setConfirmingCancel(false)}
                className="px-3 py-2 text-sm text-muted-foreground hover:underline"
              >
                Never mind
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmingCancel(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-red-600 transition-colors hover:underline dark:text-red-400"
            >
              <XCircle className="h-4 w-4" />
              Cancel my order
            </button>
          )}
        </>
      )}
    </div>
  );
}
