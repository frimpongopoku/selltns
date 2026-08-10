import Link from "next/link";
import type { Metadata } from "next";
import { Logo } from "@/components/logo";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:4310";
const EFFECTIVE_DATE = "10 August 2026";

export const metadata: Metadata = {
  title: "Terms of Service — Selltns",
  description: "The terms that govern using Selltns, built and operated by Biibisoft.",
  alternates: { canonical: `${SITE_URL}/terms` },
};

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-10">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="mt-3 space-y-3 text-sm leading-relaxed text-muted-foreground">
        {children}
      </div>
    </section>
  );
}

export default function TermsPage() {
  return (
    <div className="min-h-screen">
      <header className="border-b">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-4 sm:px-6">
          <Link href="/">
            <Logo />
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-4 py-14 sm:px-6 sm:py-20">
        <p className="text-sm font-medium text-muted-foreground">Legal</p>
        <h1 className="mt-1 text-3xl font-semibold">Terms of Service</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Effective {EFFECTIVE_DATE}
        </p>

        <p className="mt-6 text-sm leading-relaxed text-muted-foreground">
          Selltns is built and operated by Biibisoft, a business registered
          in Ghana. These terms govern your use of Selltns, whether
          you&apos;re running a store on it (a &quot;vendor&quot;) or buying
          from one (a &quot;customer&quot;). By creating a store, placing an
          order, or otherwise using Selltns, you agree to them. See our{" "}
          <Link href="/privacy" className="text-foreground underline decoration-dotted underline-offset-2">
            privacy policy
          </Link>{" "}
          for how we handle your information.
        </p>

        <Section title="What Selltns is">
          <p>
            Selltns gives vendors a storefront, order tracking, and a payment
            page — it&apos;s the platform that connects a vendor and their
            customer. Selltns is not a party to any sale: the contract for a
            product is between the vendor and the customer, not with us. We
            don&apos;t manufacture, inspect, warehouse, ship, or take
            ownership of anything sold through a Selltns store.
          </p>
        </Section>

        <Section title="Accounts">
          <p>
            You need a Google account to sign in, and you&apos;re responsible
            for whatever happens under yours. Vendor accounts are invite- or
            self-registration-based, tied to a specific email — see our{" "}
            <Link href="/privacy" className="text-foreground underline decoration-dotted underline-offset-2">
              privacy policy
            </Link>{" "}
            for how that works. You must be old enough in your jurisdiction
            to form a binding contract to use Selltns.
          </p>
        </Section>

        <Section title="If you're a vendor">
          <ul className="list-disc space-y-1.5 pl-5">
            <li>
              You&apos;re responsible for your listings being accurate — the
              price, description, photos, and stock you show customers.
            </li>
            <li>
              You&apos;re responsible for actually fulfilling confirmed
              orders, and for the Mobile Money or bank details you provide —
              Selltns displays them to customers exactly as you enter them.
            </li>
            <li>
              You handle payment collection and any dispute, refund, or
              chargeback directly with your customer — see
              &quot;Payments&quot; below.
            </li>
            <li>
              You won&apos;t list anything illegal, counterfeit, or that
              infringes someone else&apos;s rights, and you won&apos;t use
              Selltns to defraud or mislead customers.
            </li>
            <li>
              You keep the rights to your own content (product photos,
              descriptions, your story) — using Selltns just grants us a
              license to host and display it as part of running your store.
            </li>
          </ul>
        </Section>

        <Section title="If you're a customer">
          <p>
            When you place an order, you&apos;re entering an agreement with
            that vendor, not with Selltns. Before paying, confirm you
            actually trust the vendor you&apos;re dealing with — our payment
            pages carry an explicit warning about this for exactly that
            reason. A Verified badge means we&apos;ve checked that
            vendor&apos;s identity; it is not a guarantee of their conduct,
            product quality, or that an order will be fulfilled.
          </p>
        </Section>

        <Section title="Payments">
          <p>
            Selltns does not process, hold, or refund payments today —
            customers pay vendors directly, using the Mobile Money or bank
            details the vendor has added to their store. We are not a party
            to that payment and cannot reverse or refund it. If we add
            integrated payment processing in the future, these terms will be
            updated first to explain what changes.
          </p>
        </Section>

        <Section title="Fees">
          <p>
            Using Selltns to run a store is currently free — we don&apos;t
            take a cut of your sales or charge a subscription. If that
            changes, we&apos;ll give existing vendors advance notice before
            any fee applies to them.
          </p>
        </Section>

        <Section title="Suspension and termination">
          <p>
            We can suspend or remove a store that violates these terms — for
            example, credible reports of fraud, scams, or illegal listings —
            with the storefront becoming unavailable to customers while
            we&apos;re looking into it. We&apos;ll tell the vendor why. You
            can stop using Selltns at any time; contact us if you&apos;d like
            your store or account data removed.
          </p>
        </Section>

        <Section title="Disclaimers and liability">
          <p>
            Selltns is provided &quot;as is.&quot; We don&apos;t guarantee
            it&apos;ll be uninterrupted or error-free, and we don&apos;t
            vet vendors beyond what&apos;s described for the Verified badge.
            To the extent permitted by law, Biibisoft is not liable for any
            loss arising from a transaction between a vendor and a customer —
            including scams, non-delivery, or a bad-faith vendor or
            customer — or for indirect or consequential damages from using
            Selltns.
          </p>
        </Section>

        <Section title="Changes to these terms">
          <p>
            If we make material changes, we&apos;ll update the effective
            date at the top of this page. Continuing to use Selltns after a
            change means you accept the updated terms.
          </p>
        </Section>

        <Section title="Governing law">
          <p>
            These terms are governed by the laws of Ghana, without regard to
            conflict-of-law principles.
          </p>
        </Section>

        <Section title="Contact us">
          <p>
            Questions about these terms can be sent to{" "}
            <a
              href="mailto:legal@selltns.com"
              className="text-foreground underline decoration-dotted underline-offset-2"
            >
              legal@selltns.com
            </a>
            . For anything else, use our{" "}
            <Link href="/help" className="text-foreground underline decoration-dotted underline-offset-2">
              help page
            </Link>
            .
          </p>
        </Section>
      </div>
    </div>
  );
}
