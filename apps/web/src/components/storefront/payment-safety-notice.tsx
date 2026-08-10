import { ShieldAlert, ShieldCheck } from "lucide-react";

export function PaymentSafetyNotice({
  tenantName,
  verified = false,
}: {
  tenantName: string;
  verified?: boolean;
}) {
  if (verified) {
    return (
      <div className="store-card animate-in fade-in-0 slide-in-from-bottom-1 mb-6 flex flex-col gap-3 border-l-4 border-l-emerald-500 bg-emerald-500/[0.06] p-4 duration-500 sm:flex-row sm:items-start sm:gap-4 sm:p-5">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
          <ShieldCheck className="h-5 w-5" />
        </span>
        <div>
          <p className="store-heading text-sm font-semibold text-emerald-700 dark:text-emerald-400">
            Verified vendor
          </p>
          <p className="store-muted mt-1 text-sm leading-relaxed">
            Selltns has verified {tenantName}&apos;s identity. You&apos;re
            still paying them directly — Selltns doesn&apos;t process or
            hold this payment.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="store-card animate-in fade-in-0 slide-in-from-bottom-1 mb-6 flex flex-col gap-3 border-l-4 border-l-amber-500 bg-amber-500/[0.08] p-4 duration-500 sm:flex-row sm:items-start sm:gap-4 sm:p-5">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400">
        <ShieldAlert className="h-5 w-5" />
      </span>
      <div>
        <p className="store-heading text-base font-bold text-amber-700 dark:text-amber-400">
          Before you send any money
        </p>
        <p className="store-muted mt-1.5 text-sm font-medium leading-relaxed">
          Scammers impersonate real sellers. Only send money if you&apos;re
          genuinely confident you know who you&apos;re dealing with — you&apos;ve
          seen their products, spoken with them directly, or someone you
          trust has actually bought from them before.
        </p>
        <p className="store-muted mt-2 text-sm font-medium leading-relaxed">
          If anything feels unfamiliar or rushed,{" "}
          <span className="font-semibold text-amber-700 dark:text-amber-400">
            stop — don&apos;t send money yet
          </span>
          . Message the vendor to confirm first, and check that the
          recipient name shown matches {tenantName} exactly.
        </p>
        <p className="store-muted mt-2 text-xs leading-relaxed">
          You are paying {tenantName} directly. Selltns does not process,
          hold, or refund this payment, cannot reverse it once sent, and is
          not liable for any loss, fraud, or scam involving a vendor on this
          platform.
        </p>
      </div>
    </div>
  );
}
