import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/format";
import { PLAN_LABEL } from "@/lib/plan-tiers";
import type { UpgradeRequest, UpgradeRequestStatus } from "@/lib/types";

const STATUS_CLASS: Record<UpgradeRequestStatus, string> = {
  PENDING: "border-transparent bg-amber-500/15 text-amber-700 dark:text-amber-400",
  APPROVED: "border-transparent bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  REJECTED: "border-transparent bg-red-500/15 text-red-700 dark:text-red-400",
};

export function UpgradeRequestHistory({ requests }: { requests: UpgradeRequest[] }) {
  if (requests.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">You haven&apos;t requested an upgrade yet.</p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {requests.map((request) => (
        <div key={request.id} className="flex flex-col gap-1 rounded-lg border p-4 text-sm">
          <div className="flex items-center justify-between gap-2">
            <span className="font-medium">{PLAN_LABEL[request.requestedPlan]}</span>
            <Badge className={STATUS_CLASS[request.status]}>{request.status}</Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Submitted {formatDateTime(request.submittedAt)}
            {request.reviewedAt && ` · reviewed ${formatDateTime(request.reviewedAt)}`}
          </p>
          {request.status === "REJECTED" && request.rejectionReason && (
            <p className="mt-1 text-xs text-destructive">{request.rejectionReason}</p>
          )}
        </div>
      ))}
    </div>
  );
}
