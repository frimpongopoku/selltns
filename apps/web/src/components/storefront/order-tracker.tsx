"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Download, Loader2, Share2, XCircle } from "lucide-react";
import { cancelOrderByToken } from "@/lib/api";
import type { Order, Tenant } from "@/lib/types";
import { formatMoney } from "@/lib/format";
import { waLink } from "@/lib/phone";
import { useRevealedPhone } from "@/lib/use-revealed-phone";
import { generateOrderBookletPdf } from "@/lib/generate-order-pdf";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

export function TrackerActions({
  order,
  tenant,
  whatsappNumberEncoded,
  collectionTitle,
}: {
  order: Order;
  tenant: Tenant;
  whatsappNumberEncoded: string | null;
  collectionTitle?: string | null;
}) {
  const router = useRouter();
  const [cancelling, setCancelling] = useState(false);
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const [reference, setReference] = useState("");
  const whatsappNumber = useRevealedPhone(whatsappNumberEncoded);

  const shareText = `Hi ${tenant.name}, here's my order:\n${order.items
    .map((i) => `${i.quantity}x ${i.title}`)
    .join(", ")}\nTotal: ${formatMoney(order.total)}\n\nName: ${order.customerName}\nPhone: ${
    order.customerContact
  }\nEmail: ${order.customerEmail}\n\nDetails: ${
    typeof window !== "undefined" ? window.location.href : ""
  }`;
  const whatsappUrl = whatsappNumber
    ? waLink(whatsappNumber, shareText)
    : `https://wa.me/?text=${encodeURIComponent(shareText)}`;

  async function handleCancel(e: FormEvent) {
    e.preventDefault();
    setCancelling(true);
    try {
      await cancelOrderByToken(order.trackingToken, reference);
      toast.success("Order request cancelled");
      setConfirmingCancel(false);
      router.refresh();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Couldn't cancel your order. Please try again.",
      );
    } finally {
      setCancelling(false);
    }
  }

  return (
    <div className="flex flex-wrap gap-3">
      <button
        type="button"
        onClick={() => {
          try {
            generateOrderBookletPdf(order, tenant, collectionTitle);
          } catch {
            toast.error("Couldn't generate the PDF. Please try again.");
          }
        }}
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
      {(order.status === "PENDING" || order.status === "CONFIRMED") && (
        <Dialog
          open={confirmingCancel}
          onOpenChange={(open) => {
            setConfirmingCancel(open);
            if (!open) setReference("");
          }}
        >
          <button
            type="button"
            onClick={() => setConfirmingCancel(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-red-600 transition-colors hover:underline dark:text-red-400"
          >
            <XCircle className="h-4 w-4" />
            Cancel my order
          </button>
          <DialogContent>
            <form onSubmit={handleCancel}>
              <DialogHeader>
                <DialogTitle>Cancel this order?</DialogTitle>
                <DialogDescription>
                  To confirm it&apos;s really you, enter the reference from the email {tenant.name}{" "}
                  sent you when you placed this order.
                </DialogDescription>
              </DialogHeader>
              <div className="mt-4">
                <Label htmlFor="cancel-reference">Order reference</Label>
                <Input
                  id="cancel-reference"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder="e.g. AB12-CD34"
                  className="mt-1.5"
                  autoFocus
                  required
                />
              </div>
              <DialogFooter className="mt-5">
                <Button type="submit" variant="destructive" disabled={cancelling || !reference.trim()}>
                  {cancelling && <Loader2 className="h-4 w-4 animate-spin" />}
                  Yes, cancel it
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
