"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Switch } from "@/components/ui/switch";
import { updateProduct } from "@/lib/api";

export function ProductActiveToggle({
  productId,
  tenantId,
  initialActive,
}: {
  productId: string;
  tenantId: string;
  initialActive: boolean;
}) {
  const [active, setActive] = useState(initialActive);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <Switch
      checked={active}
      disabled={isPending}
      onCheckedChange={(checked) => {
        setActive(checked);
        startTransition(async () => {
          await updateProduct(productId, tenantId, { isActive: checked });
          router.refresh();
        });
      }}
    />
  );
}
