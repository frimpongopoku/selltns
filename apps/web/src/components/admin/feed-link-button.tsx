"use client";

import { Rss } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

// Copies an RSS feed URL (see apps/web/src/lib/rss-feed.ts) for pasting
// into any RSS-consuming tool — Pinterest's auto-publish feature is the
// first use case, but nothing here is Pinterest-specific.
export function FeedLinkButton({
  url,
  label = "Copy feed link",
  variant = "outline",
}: {
  url: string;
  label?: string;
  variant?: React.ComponentProps<typeof Button>["variant"];
}) {
  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Feed link copied.");
    } catch {
      toast.error("Couldn't copy the link. Please try again.");
    }
  }

  return (
    <Button type="button" variant={variant} size="sm" onClick={handleCopy} className="gap-1.5 text-xs">
      <Rss className="h-3.5 w-3.5" />
      {label}
    </Button>
  );
}
