import { MessageCircle, ListChecks } from "lucide-react";
import { waLink } from "@/lib/phone";
import { SupportContactForm } from "./support-contact-form";

const SUPPORT_WHATSAPP_NUMBER = process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP_NUMBER;

const FAQS = [
  {
    q: "Where's my order?",
    a: "Every order gets a tracking link when it's placed — check your email or texts for it. It shows the current status and updates automatically as the vendor moves it along.",
  },
  {
    q: "How do I pay for my order?",
    a: "Once a vendor confirms your order, your tracking link unlocks a payment page showing their accepted Mobile Money and bank options — no separate app or account needed.",
  },
  {
    q: "Can I change or cancel an order?",
    a: "Message the vendor directly — most stores show a WhatsApp or contact option on their storefront. If they've already confirmed changes, you'll see them reflected on your tracking link.",
  },
  {
    q: "I'm a vendor and something's broken in my dashboard.",
    a: "Tell us exactly what you were doing when it happened, and include a screenshot if you can — that's the single most useful thing you can send us.",
  },
  {
    q: "Is my payment information safe?",
    a: "Selltns never processes or stores payment details — you pay vendors directly via their own Mobile Money or bank details, shown on their payment page.",
  },
];

export function HelpCenter({ tenantId, tenantName }: { tenantId?: string; tenantName?: string }) {
  const whatsappHref = SUPPORT_WHATSAPP_NUMBER
    ? waLink(
        SUPPORT_WHATSAPP_NUMBER,
        tenantName
          ? `Hi, I need help with something on ${tenantName}'s store.`
          : "Hi, I need help with Selltns.",
      )
    : null;

  return (
    <div className="mx-auto max-w-2xl px-4 py-14 sm:px-6 sm:py-20">
      <p className="text-sm font-medium text-muted-foreground">Help</p>
      <h1 className="mt-1 text-3xl font-semibold">
        {tenantName ? `Need help with ${tenantName}?` : "How can we help?"}
      </h1>
      <p className="mt-3 text-muted-foreground">
        Most questions are answered below. If not, message us and we&apos;ll
        get back to you.
      </p>

      <section className="mt-10 rounded-xl border bg-muted/30 p-5">
        <div className="flex items-center gap-2">
          <ListChecks className="h-4 w-4 text-emerald-600" />
          <p className="text-sm font-medium">Getting a fast, useful reply</p>
        </div>
        <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">
          <li>Say what you expected to happen, and what happened instead.</li>
          <li>If it&apos;s about an order, include the tracking link.</li>
          <li>A screenshot saves a lot of back-and-forth — attach one if you can.</li>
          <li>Let us know what device/browser you were using, if it seems relevant.</li>
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold">Frequently asked</h2>
        <div className="mt-4 flex flex-col divide-y rounded-xl border">
          {FAQS.map((item) => (
            <details key={item.q} className="group p-4 open:bg-muted/30">
              <summary className="cursor-pointer list-none text-sm font-medium marker:content-none">
                {item.q}
              </summary>
              <p className="mt-2 text-sm text-muted-foreground">{item.a}</p>
            </details>
          ))}
        </div>
      </section>

      {whatsappHref && (
        <section className="mt-10 flex items-center justify-between gap-4 rounded-xl border bg-muted/30 p-5">
          <div>
            <p className="text-sm font-medium">Still stuck?</p>
            <p className="text-sm text-muted-foreground">Message us on WhatsApp.</p>
          </div>
          <a
            href={whatsappHref}
            target="_blank"
            rel="noreferrer"
            className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-emerald-700"
          >
            <MessageCircle className="h-4 w-4" />
            WhatsApp
          </a>
        </section>
      )}

      <section className="mt-10">
        <h2 className="text-lg font-semibold">Or send us a message</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Prefer not to use WhatsApp? Use this instead.
        </p>
        <div className="mt-4">
          <SupportContactForm tenantId={tenantId} />
        </div>
      </section>
    </div>
  );
}
