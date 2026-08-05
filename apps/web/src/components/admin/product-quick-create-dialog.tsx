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
import { ProductForm } from "@/components/admin/product-form";

export function ProductQuickCreateDialog({ tenantId }: { tenantId: string }) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button className="gap-1.5" />}>
        <Plus className="h-4 w-4" />
        New product
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>New product</DialogTitle>
        </DialogHeader>
        {open && <ProductForm tenantId={tenantId} onSaved={() => setOpen(false)} />}
      </DialogContent>
    </Dialog>
  );
}
