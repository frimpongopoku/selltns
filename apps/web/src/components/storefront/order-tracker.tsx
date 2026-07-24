"use client";

import { toast } from "sonner";
import { Download, Share2 } from "lucide-react";
import type { Order, Tenant } from "@/lib/types";
import { formatMoney } from "@/lib/format";

export function TrackerActions({ order, tenant }: { order: Order; tenant: Tenant }) {
  const shareText = encodeURIComponent(
    `${tenant.name} — Order for ${order.customerName}\n${order.items
      .map((i) => `${i.quantity}x ${i.title}`)
      .join(", ")}\nTotal: ${formatMoney(order.total)}\nTrack it: ${
      typeof window !== "undefined" ? window.location.href : ""
    }`,
  );

  return (
    <div className="flex flex-wrap gap-3">
      <button
        type="button"
        onClick={() => toast.info("PDF booklet generation is coming soon — this is a mock action.")}
        className="store-btn-secondary inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium"
      >
        <Download className="h-4 w-4" />
        Download PDF booklet
      </button>
      <button
        type="button"
        onClick={() => window.open(`https://wa.me/?text=${shareText}`, "_blank")}
        className="store-btn-secondary inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium"
      >
        <Share2 className="h-4 w-4" />
        Share to WhatsApp
      </button>
    </div>
  );
}
