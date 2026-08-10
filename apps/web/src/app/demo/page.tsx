import { redirect } from "next/navigation";

// "demo" is a reserved slug (apps/api's RESERVED_SLUGS) precisely so this
// route can own it — the landing page links here ("See a live store") from
// several places rather than hardcoding the actual demo tenant's slug, so
// that slug can change in one place if the seeded example store is ever
// renamed.
const DEMO_TENANT_SLUG = "akosua";

export default function DemoRedirectPage() {
  redirect(`/${DEMO_TENANT_SLUG}`);
}
