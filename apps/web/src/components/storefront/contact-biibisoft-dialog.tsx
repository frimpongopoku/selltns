"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { SupportContactForm } from "@/components/help/support-contact-form";

export const BIIBISOFT_CONTACT_EMAIL = "hello@biibisoft.com";

export function ContactBiibisoftDialog({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={className}
      >
        Biibisoft Team
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Contact the Biibisoft team</DialogTitle>
            <DialogDescription>
              Send a message straight to the team that builds Selltns — or{" "}
              <a href={`mailto:${BIIBISOFT_CONTACT_EMAIL}`}>email us directly</a>.
            </DialogDescription>
          </DialogHeader>
          <SupportContactForm audience="biibisoft" />
        </DialogContent>
      </Dialog>
    </>
  );
}
