"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";

export function CopyValue({ value, label }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast.success(label ? `${label} copied` : "Copied");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Couldn't copy — try selecting the text manually.");
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="inline-flex items-center gap-1.5 text-left transition-colors hover:text-[var(--store-primary)]"
      title="Copy to clipboard"
    >
      <span>{value}</span>
      {copied ? (
        <Check className="h-3.5 w-3.5 shrink-0 text-green-600 dark:text-green-400" />
      ) : (
        <Copy className="h-3.5 w-3.5 shrink-0 opacity-50" />
      )}
    </button>
  );
}
