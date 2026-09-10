import { MessageCircleHeart } from "lucide-react";
import { waLink } from "@/lib/phone";
import type { Tenant } from "@/lib/types";

// Off by default (Settings > Store profile > Custom order requests) and
// has no effect without a WhatsApp number — same "explicit opt-in" model
// as the general contact section. Unlike that section, this doesn't need
// the obscure/reveal treatment: the WhatsApp number is already present in
// plain text on every one of these pages via the Store/Product JSON-LD's
// `telephone` field (see structured-data.ts), so there's nothing extra to
// protect by hiding it here too.
export function BespokeRequestBanner({
  tenant,
  context,
}: {
  tenant: Tenant;
  /** What the visitor was browsing (a collection title, say) — folded into
   * the pre-filled WhatsApp message so the vendor has some context. */
  context?: string;
}) {
  if (!tenant.bespokeRequestsEnabled || !tenant.whatsappNumber) return null;

  const message = context
    ? `Hi ${tenant.name}! I was browsing your "${context}" but didn't see exactly what I'm looking for — could you make something custom for me?`
    : `Hi ${tenant.name}! I didn't see exactly what I'm looking for in your shop — could you make something custom for me?`;

  return (
    <div className="store-card mt-10 flex flex-col items-center gap-4 p-6 text-center sm:flex-row sm:justify-between sm:text-left">
      <div className="flex items-center gap-3">
        <MessageCircleHeart className="store-accent-text h-6 w-6 shrink-0" />
        <div>
          <p className="store-heading font-medium">Don&apos;t see what you&apos;re looking for?</p>
          <p className="store-muted text-sm">
            {tenant.name} takes custom orders — tell us what you have in mind.
          </p>
        </div>
      </div>
      <a
        href={waLink(tenant.whatsappNumber, message)}
        target="_blank"
        rel="noreferrer"
        className="store-btn-primary shrink-0 px-5 py-2.5 text-sm font-medium"
      >
        Message us on WhatsApp
      </a>
    </div>
  );
}
