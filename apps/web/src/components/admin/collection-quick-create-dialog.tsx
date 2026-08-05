"use client";

import { useState } from "react";
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
import type { Product } from "@/lib/types";

export function CollectionQuickCreateDialog({
  tenantId,
  products,
}: {
  tenantId: string;
  products: Product[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button className="gap-1.5" />}>
        <Plus className="h-4 w-4" />
        New collection
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>New collection</DialogTitle>
        </DialogHeader>
        {open && (
          <CollectionForm tenantId={tenantId} products={products} onSaved={() => setOpen(false)} />
        )}
      </DialogContent>
    </Dialog>
  );
}
