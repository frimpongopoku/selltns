import Link from "next/link";
import type { Metadata } from "next";
import { Logo } from "@/components/logo";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:4310";
const EFFECTIVE_DATE = "12 August 2026";

export const metadata: Metadata = {
  title: "Privacy policy — Selltns",
  description:
    "How Selltns, built and operated by Biibisoft, collects, uses, and protects your information.",
  alternates: { canonical: `${SITE_URL}/privacy` },
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

export default function PrivacyPage() {
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
        <h1 className="mt-1 text-3xl font-semibold">Privacy policy</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Effective {EFFECTIVE_DATE}
        </p>

        <p className="mt-6 text-sm leading-relaxed text-muted-foreground">
          Selltns is built and operated by Biibisoft, a business registered
          in Ghana. This policy explains what information we collect
          through Selltns, why we collect it, who we share it with, and the
          choices you have. It applies to everyone who uses Selltns: store
          owners and their staff (&quot;vendors&quot;), and the people who
          buy from a Selltns storefront (&quot;customers&quot;).
        </p>

        <Section title="Who this covers, and who is responsible for what">
          <p>
            Biibisoft is the data controller for the account and platform
            data described below — the information needed to run Selltns
            itself. A vendor is separately the data controller for their own
            store: the products they list, the orders they receive, and how
            they use their customers&apos; contact details to fulfil an
            order (for example, messaging a customer on WhatsApp about
            delivery). If you&apos;re a customer with a question about how a
            specific store is using your information, the fastest route is
            to contact that store directly — most storefronts show a
            WhatsApp or contact option.
          </p>
        </Section>

        <Section title="Information we collect">
          <p>
            <strong className="text-foreground">
              If you run a store on Selltns:
            </strong>{" "}
            your name and email address (from signing in with Google), the
            store details you enter (store name, description, story, theme,
            and any media you upload), the Mobile Money or bank details you
            add so customers can pay you, and information about any staff or
            managers you invite to your store.
          </p>
          <p>
            <strong className="text-foreground">
              If you buy from a Selltns store:
            </strong>{" "}
            your name, phone or WhatsApp number, email address, and delivery
            address, all supplied when you place an order — plus the order
            itself (items, amount, and status history) and the messages you
            send if you contact us or a store through the help form.
          </p>
          <p>
            <strong className="text-foreground">Collected automatically:</strong>{" "}
            basic technical logs (things like request timestamps and error
            details) that help us keep Selltns running and fix bugs, and, on
            stores where analytics is enabled, general usage data such as
            which pages are viewed. We don&apos;t track you across other
            websites.
          </p>
        </Section>

        <Section title="How we use it">
          <ul className="list-disc space-y-1.5 pl-5">
            <li>To create and run vendor accounts and storefronts</li>
            <li>
              To process orders and give customers a working tracking link
              from request through to delivery
            </li>
            <li>
              To send order confirmations, status updates, and team invite
              emails
            </li>
            <li>To respond when you contact our help line or a store&apos;s</li>
            <li>To detect, investigate, and prevent abuse or fraud</li>
            <li>To fix bugs and improve Selltns</li>
            <li>To meet our legal obligations</li>
          </ul>
        </Section>

        <Section title="Payments">
          <p>
            Selltns does not yet process or store card or Mobile Money
            transaction details, and we never see your PIN. Today, when a
            vendor confirms an order, the customer pays the vendor directly,
            using the Mobile Money or bank details the vendor has added to
            their store, and we are not a party to that payment. We plan to
            add integrated payment processing in the future — if we do,
            this policy will be updated first to explain exactly what
            changes and what new information that involves.
          </p>
        </Section>

        <Section title="Plan billing">
          <p>
            Selltns doesn&apos;t have paid plans yet. When it does, requesting
            one will mean sending payment directly to Selltns and submitting
            a reference or note describing it — we won&apos;t collect or
            store your card, Mobile Money PIN, or any transaction
            credentials through this, you&apos;d send the payment yourself
            the same way you&apos;d send anyone else money. That
            reference/note would be reviewed by authorized Selltns staff to
            confirm the payment and approve or reject the request, and kept
            as a record of your plan history. This policy will be updated
            first when paid plans launch.
          </p>
        </Section>

        <Section title="Vendor verification (the Verified badge)">
          <p>
            If you apply for a Verified badge, you submit your full legal
            name, your Ghana Card number, and a photo of the card — an
            optional selfie can strengthen the review. This is stored
            separately from the rest of your store data, in storage that
            isn&apos;t publicly accessible, and is reviewed only by
            authorized Selltns staff to confirm your identity. It&apos;s
            used solely for that purpose — it isn&apos;t shown to customers,
            other vendors, or any third party, and we don&apos;t use it for
            anything beyond deciding and administering your verification
            status.
          </p>
        </Section>

        <Section title="Who we share information with">
          <p>
            We don&apos;t sell your information. We share it only where
            necessary to run Selltns, with:
          </p>
          <ul className="list-disc space-y-1.5 pl-5">
            <li>
              <strong className="text-foreground">Google / Firebase</strong>{" "}
              — to sign vendors in securely, without us handling passwords
            </li>
            <li>
              <strong className="text-foreground">Brevo</strong> — to
              deliver transactional emails (order updates, invites, support
              replies)
            </li>
            <li>
              <strong className="text-foreground">Sentry</strong> — to
              capture technical error reports when something breaks, so we
              can fix it
            </li>
            <li>
              <strong className="text-foreground">PostHog</strong> — on
              stores where it&apos;s enabled, to understand product usage in
              aggregate
            </li>
            <li>
              our hosting providers, who store and run the application and
              database
            </li>
          </ul>
          <p>
            We may also disclose information if required by law, or to
            protect the rights, property, or safety of Selltns, our
            vendors, or the public. Some of these providers process data
            outside Ghana; where that happens, we rely on their own
            safeguards for handling personal data.
          </p>
        </Section>

        <Section title="Cookies and similar technology">
          <p>
            Vendor accounts use a secure, httpOnly session cookie to keep
            you signed in — it isn&apos;t used for tracking. Where analytics
            is enabled on a store, PostHog may set cookies or use local
            storage in your browser to distinguish visitors.
          </p>
        </Section>

        <Section title="How long we keep information">
          <p>
            We keep account and order information for as long as the
            related store is active, plus a reasonable period afterward for
            legal, accounting, or dispute-resolution purposes. You can ask
            us to delete information that isn&apos;t otherwise required to
            be kept — see &quot;Your rights&quot; below.
          </p>
        </Section>

        <Section title="Security">
          <p>
            We use industry-standard measures to protect your information,
            including encrypted connections (HTTPS), httpOnly session
            cookies, and role-based access controls that limit what each
            member of a store&apos;s team can see or do. No system is
            perfectly secure, and we can&apos;t guarantee absolute
            protection.
          </p>
        </Section>

        <Section title="Your rights">
          <p>
            Under Ghana&apos;s Data Protection Act, 2012 (Act 843), you can
            ask us to confirm what personal information we hold about you,
            correct it if it&apos;s inaccurate, or delete it, and you can
            object to certain uses of it. To make a request, email{" "}
            <a
              href="mailto:privacy@selltns.com"
              className="text-foreground underline decoration-dotted underline-offset-2"
            >
              privacy@selltns.com
            </a>
            . You also have the right to lodge a complaint with Ghana&apos;s
            Data Protection Commission.
          </p>
        </Section>

        <Section title="Children">
          <p>
            Selltns isn&apos;t directed at children, and we don&apos;t
            knowingly collect information from anyone under 18.
          </p>
        </Section>

        <Section title="Changes to this policy">
          <p>
            If we make material changes, we&apos;ll update the effective
            date at the top of this page. Continuing to use Selltns after a
            change means you accept the updated policy.
          </p>
        </Section>

        <Section title="Contact us">
          <p>
            Questions about this policy or your information can be sent to{" "}
            <a
              href="mailto:privacy@selltns.com"
              className="text-foreground underline decoration-dotted underline-offset-2"
            >
              privacy@selltns.com
            </a>
            . For anything else, use our{" "}
            <Link
              href="/help"
              className="text-foreground underline decoration-dotted underline-offset-2"
            >
              help page
            </Link>
            .
          </p>
        </Section>
      </div>
    </div>
  );
}
