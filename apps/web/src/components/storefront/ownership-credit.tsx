import { BadgeCheck } from "lucide-react";
import type { Tenant } from "@/lib/types";

// Renders nothing unless the vendor has both filled this in AND opted in
// via the visibility toggle (Settings > Store profile) — off by default.
export function OwnershipCredit({
  tenant,
  variant = "inline",
}: {
  tenant: Tenant;
  variant?: "inline" | "card";
}) {
  if (!tenant.ownerInfoVisible || !tenant.ownerDisplayName) return null;

  if (variant === "card") {
    return (
      <div className="store-card flex items-start gap-3 p-4">
        <BadgeCheck className="store-accent-text mt-0.5 h-4 w-4 shrink-0" />
        <div>
          <p className="text-sm">
            <span className="font-medium">{tenant.ownerDisplayName}</span>
            {tenant.ownerTitle && (
              <span className="store-muted"> · {tenant.ownerTitle}</span>
            )}
          </p>
          <p className="store-muted mt-0.5 text-xs">
            {tenant.ownerBio || `Behind ${tenant.name}.`}
          </p>
        </div>
      </div>
    );
  }

  return (
    <p className="store-muted text-xs leading-relaxed">
      {tenant.name} is run by {tenant.ownerDisplayName}
      {tenant.ownerTitle ? `, ${tenant.ownerTitle}` : ""}.
    </p>
  );
}
