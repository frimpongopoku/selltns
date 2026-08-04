import { Card } from "@/components/ui/card";
import type { LucideIcon } from "lucide-react";

export function StatCard({
  label,
  value,
  icon: Icon,
  hint,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  hint?: string;
}) {
  return (
    <Card className="flex h-full flex-col gap-4 p-5 transition-shadow duration-200 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <p className="min-h-10 text-sm font-medium leading-snug text-muted-foreground">
          {label}
        </p>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary ring-1 ring-primary/15">
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <div className="mt-auto">
        <p className="text-3xl font-bold tracking-tight tabular-nums">{value}</p>
        <div className="mt-1 min-h-4 text-xs text-muted-foreground">{hint}</div>
      </div>
    </Card>
  );
}
