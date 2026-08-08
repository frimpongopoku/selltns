import { redirect } from "next/navigation";
import * as Sentry from "@sentry/nextjs";
import { getMe } from "@/lib/get-me";
import { AdminShell } from "@/components/admin/admin-shell";
import { SentryUserContext } from "@/components/sentry-context";
import { PostHogIdentify } from "@/components/analytics/posthog-identify";
import type { TeamMember } from "@/lib/types";

export default async function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const me = await getMe();
  if (!me) {
    redirect("/admin/login");
  }

  Sentry.setUser({ id: me.user.id, email: me.user.email });
  Sentry.setTag("tenantId", me.tenant.id);
  Sentry.setTag("role", me.role);

  const currentUser: TeamMember = {
    id: me.user.id,
    tenantId: me.tenant.id,
    name: me.user.name,
    email: me.user.email,
    role: me.role,
    invitedAt: me.tenant.createdAt,
    acceptedAt: me.tenant.createdAt,
  };

  return (
    <AdminShell tenant={me.tenant} spaces={me.spaces} user={currentUser}>
      <SentryUserContext
        userId={me.user.id}
        email={me.user.email}
        tenantId={me.tenant.id}
        tenantSlug={me.tenant.slug}
        role={me.role}
      />
      <PostHogIdentify
        userId={me.user.id}
        email={me.user.email}
        tenantId={me.tenant.id}
        tenantSlug={me.tenant.slug}
        role={me.role}
      />
      {children}
    </AdminShell>
  );
}
