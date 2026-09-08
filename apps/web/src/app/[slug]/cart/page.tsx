import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getTenantBySlug } from "@/lib/api";
import { CartView } from "./cart-view";

export const metadata: Metadata = {
  title: "Cart",
  robots: { index: false, follow: true },
};

export default async function CartPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const tenant = await getTenantBySlug(slug).catch(() => null);
  if (!tenant) notFound();
  return <CartView tenantId={tenant.id} />;
}
