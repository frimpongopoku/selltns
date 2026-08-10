import { Badge } from "@/components/ui/badge";
import type { VerificationRequestStatus } from "@/lib/superadmin-types";

// Status color meaning (verified=green, rejected=red, pending=amber) stays
// constant everywhere in the app, storefront included — only the console's
// neutral chrome goes violet. Overrides Badge's default variant (which
// would otherwise inherit the scope's violet primary) with explicit
// semantic colors, same technique as team-manager.tsx's ROLE_STYLES.
export function VerifiedPill({ label = "Verified" }: { label?: string }) {
  return (
    <Badge className="border-transparent bg-emerald-500/15 text-emerald-400">{label}</Badge>
  );
}

const REQUEST_STATUS_CLASS: Record<VerificationRequestStatus, string> = {
  PENDING: "border-transparent bg-amber-500/15 text-amber-400",
  APPROVED: "border-transparent bg-emerald-500/15 text-emerald-400",
  REJECTED: "border-transparent bg-red-500/15 text-red-400",
};

export function RequestStatusBadge({ status }: { status: VerificationRequestStatus }) {
  return <Badge className={REQUEST_STATUS_CLASS[status]}>{status}</Badge>;
}
