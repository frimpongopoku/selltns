"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { setBillingMessage } from "@/lib/superadmin-api";

export function BillingMessageEditor({ initialMessage }: { initialMessage: string }) {
  const [message, setMessage] = useState(initialMessage);
  const [saving, setSaving] = useState(false);
  const dirty = message !== initialMessage;

  async function handleSave() {
    setSaving(true);
    try {
      await setBillingMessage(message);
      toast.success("Instructions updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't save these instructions");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <Textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        rows={5}
        placeholder={
          "e.g. Send the exact plan amount, then include your shop name as the payment reference so we can match it to your request. We review these within a day."
        }
        className="font-sans"
      />
      <p className="mt-1.5 text-xs text-muted-foreground">
        Shown to vendors on their Upgrade page, right under the payment details above. Line breaks
        are kept — write it the way you&apos;d want a vendor to read it.
      </p>
      <Button onClick={handleSave} disabled={saving || !dirty} className="mt-3">
        {saving ? "Saving…" : "Save instructions"}
      </Button>
    </div>
  );
}
