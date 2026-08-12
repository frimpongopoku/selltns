"use client";

import { useState } from "react";
import { Check, Copy, Landmark, Smartphone } from "lucide-react";
import { Card } from "@/components/ui/card";
import type { PlatformPaymentMethod } from "@/lib/types";

interface Row {
  label: string;
  value: string;
  copyable?: boolean;
}

function rowsFor(method: PlatformPaymentMethod): Row[] {
  if (method.type === "MOMO") {
    return [
      { label: "Network", value: method.details.network },
      { label: "Number", value: method.details.number, copyable: true },
      { label: "Name", value: method.details.name },
    ].filter((r) => r.value);
  }
  return [
    { label: "Account name", value: method.details.accountName },
    { label: "Account number", value: method.details.accountNumber, copyable: true },
    { label: "Branch", value: method.details.branch },
  ].filter((r) => r.value);
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label={`Copy ${value}`}
      className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
    >
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}

export function PlatformPaymentMethodCard({ method }: { method: PlatformPaymentMethod }) {
  const rows = rowsFor(method);

  return (
    <Card className="overflow-hidden p-0">
      <div className="flex items-center justify-between border-b px-5 py-4">
        <div className="flex items-center gap-2.5">
          {method.type === "MOMO" ? (
            <Smartphone className="h-4 w-4 text-muted-foreground" />
          ) : (
            <Landmark className="h-4 w-4 text-muted-foreground" />
          )}
          <span className="font-medium">{method.label}</span>
        </div>
        {method.isPreferred && (
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
            Preferred
          </span>
        )}
      </div>
      <dl>
        {rows.map((row) => (
          <div
            key={row.label}
            className="flex items-center justify-between gap-3 border-b px-5 py-3 last:border-b-0"
          >
            <dt className="text-xs text-muted-foreground">{row.label}</dt>
            <dd className="flex items-center gap-1.5 text-sm font-medium">
              <span>{row.value}</span>
              {row.copyable && <CopyButton value={row.value} />}
            </dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}
