import { CalendarClock } from "lucide-react";
import type { Collection } from "@/lib/types";

export function PreorderBanner({ collection }: { collection: Collection }) {
  if (collection.type !== "PREORDER") return null;

  const depositLine =
    collection.depositType === "FULL"
      ? "Pay in full when we confirm your request."
      : `Pay a ${collection.depositPercentage}% deposit when we confirm your request — the rest once it's ready.`;

  return (
    <div className="store-card animate-in fade-in-0 slide-in-from-bottom-1 mt-6 mb-2 flex flex-col gap-3 border-l-4 border-l-amber-500 bg-amber-500/[0.06] p-4 duration-500 sm:flex-row sm:items-start sm:gap-4 sm:p-5">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400">
        <CalendarClock className="animate-attention-pulse h-5 w-5" style={{ ["--store-accent" as string]: "var(--color-amber-500, #f59e0b)" }} />
      </span>
      <div>
        <p className="store-heading text-sm font-semibold text-amber-700 dark:text-amber-400">
          This is a pre-order shop
        </p>
        <p className="store-muted mt-1 text-sm leading-relaxed">
          Every piece here is made after you request it, not pulled from a shelf. {depositLine}
        </p>
        {collection.fulfillmentNote && (
          <p className="store-muted mt-1.5 text-xs leading-relaxed">
            <span className="font-medium text-amber-700 dark:text-amber-400">Timeline: </span>
            {collection.fulfillmentNote}
          </p>
        )}
      </div>
    </div>
  );
}
