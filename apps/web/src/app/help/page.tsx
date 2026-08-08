import Link from "next/link";
import type { Metadata } from "next";
import { Logo } from "@/components/logo";
import { HelpCenter } from "@/components/help/help-center";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:4310";

export const metadata: Metadata = {
  title: "Help & support — Selltns",
  description: "Get help with Selltns — FAQs, tips for a fast reply, and how to reach us.",
  alternates: { canonical: `${SITE_URL}/help` },
};

export default function PlatformHelpPage() {
  return (
    <div className="min-h-screen">
      <header className="border-b">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-4 sm:px-6">
          <Link href="/">
            <Logo />
          </Link>
        </div>
      </header>
      <HelpCenter />
    </div>
  );
}
