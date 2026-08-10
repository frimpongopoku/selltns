import { ShieldAlert } from "lucide-react";
import type { Tenant } from "@/lib/types";

// Deliberately doesn't surface tenant.suspendedReason here — that's an
// internal note for the vendor (shown instead in their admin dashboard),
// not something to publish to every storefront visitor.
export function SuspendedStoreNotice({ tenant }: { tenant: Tenant }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400">
        <ShieldAlert className="h-7 w-7" />
      </span>
      <h1 className="mt-5 text-xl font-semibold">This store is unavailable</h1>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        {tenant.name} isn&apos;t currently accepting orders on Selltns.
      </p>
    </div>
  );
}
