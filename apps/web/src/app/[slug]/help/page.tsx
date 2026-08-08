import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getTenantBySlug } from "@/lib/api";
import { getCanonicalUrl } from "@/lib/canonical";
import { HelpCenter } from "@/components/help/help-center";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const tenant = await getTenantBySlug(slug).catch(() => null);
  if (!tenant) return { title: "Store not found" };
  return {
    title: `Help — ${tenant.name}`,
    description: `Get help with an order or question from ${tenant.name}.`,
    alternates: { canonical: getCanonicalUrl(tenant, "/help") },
    robots: { index: false, follow: true },
  };
}

export default async function StoreHelpPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const tenant = await getTenantBySlug(slug).catch(() => null);
  if (!tenant) notFound();

  return <HelpCenter tenantId={tenant.id} tenantName={tenant.name} />;
}
