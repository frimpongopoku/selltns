"use client";

import { Mail, MessageCircle, Phone } from "lucide-react";
import { useRevealedPhone } from "@/lib/use-revealed-phone";
import { waLink } from "@/lib/phone";

// Shown only when the vendor has both opted in (Settings > Store profile >
// Contact section) and filled in at least one channel. The WhatsApp number
// and email arrive pre-obscured (see [slug]/layout.tsx) so a bot fetching
// the page source never sees the raw values — only decoded here, client-side,
// after mount (obscurePhone/revealPhone are generic string tokens, not
// phone-specific, despite the name — reused here for the email too).
export function ContactSection({
  visible,
  whatsappNumberEncoded,
  contactEmailEncoded,
}: {
  visible: boolean;
  whatsappNumberEncoded: string | null;
  contactEmailEncoded: string | null;
}) {
  const whatsappNumber = useRevealedPhone(whatsappNumberEncoded);
  const contactEmail = useRevealedPhone(contactEmailEncoded);

  if (!visible || (!whatsappNumber && !contactEmail)) return null;

  return (
    <div className="store-card mt-8 flex flex-wrap items-center gap-x-5 gap-y-3 p-4">
      <span className="store-muted text-xs font-medium tracking-wide uppercase">
        Get in touch
      </span>
      {whatsappNumber && (
        <>
          <a
            href={`tel:+${whatsappNumber}`}
            className="flex items-center gap-1.5 text-sm transition-colors hover:text-[var(--store-primary)]"
          >
            <Phone className="h-3.5 w-3.5" />
            Call
          </a>
          <a
            href={waLink(whatsappNumber)}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 text-sm transition-colors hover:text-[var(--store-primary)]"
          >
            <MessageCircle className="h-3.5 w-3.5" />
            WhatsApp
          </a>
        </>
      )}
      {contactEmail && (
        <a
          href={`mailto:${contactEmail}`}
          className="flex items-center gap-1.5 text-sm transition-colors hover:text-[var(--store-primary)]"
        >
          <Mail className="h-3.5 w-3.5" />
          Email
        </a>
      )}
    </div>
  );
}
