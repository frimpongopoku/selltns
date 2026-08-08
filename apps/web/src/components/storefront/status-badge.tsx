import type { OrderStatus } from "@/lib/types";

const STYLES: Record<OrderStatus, string> = {
  PENDING: "bg-amber-100 text-amber-800",
  CONFIRMED: "bg-emerald-100 text-emerald-800",
  MODIFIED: "bg-blue-100 text-blue-800",
  COMPLETED: "bg-neutral-900 text-white",
  CANCELLED: "bg-red-100 text-red-800",
};

const LABELS: Record<OrderStatus, string> = {
  PENDING: "Pending review",
  CONFIRMED: "Confirmed, ready for payment",
  MODIFIED: "Modified",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

export function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${STYLES[status]}`}
    >
      {status === "PENDING" && (
        <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-amber-600 text-amber-600 dark:bg-amber-400 dark:text-amber-400" />
      )}
      {LABELS[status]}
    </span>
  );
}
