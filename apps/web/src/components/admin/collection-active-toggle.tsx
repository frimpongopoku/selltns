"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Switch } from "@/components/ui/switch";
import { updateCollection } from "@/lib/api";

export function CollectionActiveToggle({
  collectionId,
  tenantId,
  initialActive,
  onToggled,
}: {
  collectionId: string;
  tenantId: string;
  initialActive: boolean;
  /** Called after a successful toggle — for client-driven lists that aren't refetched via router.refresh(). */
  onToggled?: (isActive: boolean) => void;
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
          await updateCollection(collectionId, tenantId, { isActive: checked });
          onToggled?.(checked);
          router.refresh();
        });
      }}
    />
  );
}
