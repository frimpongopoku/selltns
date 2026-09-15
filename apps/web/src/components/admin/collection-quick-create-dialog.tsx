"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CollectionForm } from "@/components/admin/collection-form";
import { emitCollectionCreated } from "@/lib/collection-events";

export function CollectionQuickCreateDialog({
  tenantId,
  defaultPreorder = false,
  triggerLabel = "New collection",
}: {
  tenantId: string;
  defaultPreorder?: boolean;
  triggerLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button className="gap-1.5" />}>
        <Plus className="h-4 w-4" />
        {triggerLabel}
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{defaultPreorder ? "New pre-order collection" : "New collection"}</DialogTitle>
        </DialogHeader>
        {open && (
          <CollectionForm
            tenantId={tenantId}
            defaultPreorder={defaultPreorder}
            onSaved={(created) => {
              setOpen(false);
              emitCollectionCreated(created);
              // Straight to its own edit page — that's where flyer/feed/
              // affiliate-item sections that only apply to an existing
              // collection actually live, not this creation dialog.
              router.push(`/admin/collections/${created.id}`);
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
