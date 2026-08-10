import { ShieldCheck } from "lucide-react";

export function VerifiedBadge({ className = "" }: { className?: string }) {
  return (
    <span
      title="Selltns has verified this vendor's identity"
      className={`inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400 ${className}`}
    >
      <ShieldCheck className="h-3 w-3" />
      Verified
    </span>
  );
}
