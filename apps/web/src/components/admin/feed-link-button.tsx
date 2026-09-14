"use client";

import { Rss } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

// Copies an RSS feed URL (see apps/web/src/lib/rss-feed.ts) for pasting
// into Pinterest's "Create Pins in bulk → Connect RSS feed" setting, or
// any other RSS-consuming tool.
export function FeedLinkButton({ url, label = "Copy feed link" }: { url: string; label?: string }) {
  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Feed link copied — paste it into Pinterest\'s "Connect RSS feed" setting.');
    } catch {
      toast.error("Couldn't copy the link. Please try again.");
    }
  }

  return (
    <Button type="button" variant="outline" size="sm" onClick={handleCopy} className="gap-1.5">
      <Rss className="h-3.5 w-3.5" />
      {label}
    </Button>
  );
}
