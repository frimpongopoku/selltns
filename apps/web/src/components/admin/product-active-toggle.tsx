"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Switch } from "@/components/ui/switch";
import { updateProduct } from "@/lib/api";

export function ProductActiveToggle({
  productId,
  initialActive,
}: {
  productId: string;
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
          await updateProduct(productId, { isActive: checked });
          router.refresh();
        });
      }}
    />
  );
}
