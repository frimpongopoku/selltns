"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Layers, Loader2, Rows3 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { sendGalleryToDrop } from "@/lib/api";
import { cn } from "@/lib/utils";
import { PhotoDropHelp } from "@/components/photo-drop/photo-drop-help";

// Hands selected gallery photos to the team through Photo Drop, where they
// add prices, sizes, colors and more photos. The photos stay in the gallery.
export function SendToDropDialog({
  open,
  onOpenChange,
  assetIds,
  onSent,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assetIds: string[];
  onSent: () => void;
}) {
  const router = useRouter();
  const [asOne, setAsOne] = useState(false);
  const [sending, setSending] = useState(false);
  const count = assetIds.length;

  async function handleSend() {
    setSending(true);
    try {
      const { added, skipped } = await sendGalleryToDrop(assetIds, asOne);
      const sent =
        added === 0
          ? "Those photos are already in the photo drop"
          : asOne
            ? "Sent to the photo drop as one product"
            : `Sent ${added} item${added === 1 ? "" : "s"} to the photo drop`;
      toast.success(sent, {
        description: added > 0 && skipped > 0 ? `${skipped} already there were skipped.` : undefined,
        action: { label: "Open", onClick: () => router.push("/admin/gallery/photo-drop") },
      });
      onSent();
      onOpenChange(false);
    } catch (err) {
      toast.error((err as Error).message || "Couldn't send to the photo drop");
    } finally {
      setSending(false);
    }
  }

  const options = [
    {
      value: false,
      icon: Rows3,
      title: "Separate products",
      body: `Each photo becomes its own item (${count}).`,
    },
    {
      value: true,
      icon: Layers,
      title: "One product",
      body: `All ${count} photos are angles of the same product.`,
    },
  ];

  return (
    <Dialog open={open} onOpenChange={(next) => !sending && onOpenChange(next)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            Send {count === 1 ? "this photo" : `${count} photos`} to the photo drop?
          </DialogTitle>
          <DialogDescription>
            Your team fills in prices, sizes and colors on the team link, and can add more photos. The photos stay in
            your gallery.
          </DialogDescription>
        </DialogHeader>
        <div className="-mt-1">
          <PhotoDropHelp audience="admin" />
        </div>

        {count > 1 && (
          <div className="grid gap-2 sm:grid-cols-2">
            {options.map(({ value, icon: Icon, title, body }) => (
              <button
                key={title}
                type="button"
                onClick={() => setAsOne(value)}
                aria-pressed={asOne === value}
                className={cn(
                  "flex flex-col gap-1 rounded-lg border p-3 text-left transition-colors",
                  asOne === value ? "border-foreground ring-1 ring-foreground" : "hover:bg-muted",
                )}
              >
                <span className="flex items-center gap-1.5 text-sm font-medium">
                  <Icon className="h-4 w-4" />
                  {title}
                </span>
                <span className="text-xs text-muted-foreground">{body}</span>
              </button>
            ))}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={sending}>
            Cancel
          </Button>
          <Button onClick={handleSend} disabled={sending || count === 0} className="gap-1.5">
            {sending && <Loader2 className="h-4 w-4 animate-spin" />}
            Send to photo drop
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
