"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";

const COUNT_UP_MS = 700;
const isPlainInteger = (value: string) => /^\d+$/.test(value);

/** Eases a plain integer stat (order counts, product counts) up from 0 on mount.
 * Currency and other formatted values just fade/rise in — parsing a locale
 * currency string back into a number to re-format it every frame isn't worth
 * the risk of it drifting out of sync with `formatMoney`. */
function useCountUp(value: string) {
  const numeric = isPlainInteger(value);
  const [display, setDisplay] = useState("0");
  const frame = useRef<number | null>(null);

  useEffect(() => {
    if (!numeric) return;
    const target = Number(value);
    const start = performance.now();
    function tick(now: number) {
      const progress = Math.min((now - start) / COUNT_UP_MS, 1);
      const eased = 1 - (1 - progress) ** 3;
      setDisplay(String(Math.round(target * eased)));
      if (progress < 1) frame.current = requestAnimationFrame(tick);
    }
    frame.current = requestAnimationFrame(tick);
    return () => {
      if (frame.current) cancelAnimationFrame(frame.current);
    };
  }, [value, numeric]);

  return numeric ? display : value;
}

export function StatCard({
  label,
  value,
  icon,
  hint,
}: {
  label: string;
  value: string;
  // A pre-rendered icon element, not a component reference — a Server
  // Component can pass JSX like this across to a Client Component, but not
  // a raw component function (e.g. `icon: LucideIcon`), which RSC can't
  // serialize.
  icon: ReactNode;
  hint?: string;
}) {
  const display = useCountUp(value);

  return (
    <Card className="flex h-full flex-col gap-4 p-5 transition-shadow duration-200 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <p className="min-h-10 text-sm font-medium leading-snug text-muted-foreground">
          {label}
        </p>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary ring-1 ring-primary/15">
          {icon}
        </div>
      </div>
      <div className="mt-auto">
        <p className="animate-count-in text-3xl font-bold tracking-tight tabular-nums">{display}</p>
        <div className="mt-1 min-h-4 text-xs text-muted-foreground">{hint}</div>
      </div>
    </Card>
  );
}
