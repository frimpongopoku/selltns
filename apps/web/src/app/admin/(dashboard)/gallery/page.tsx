import Link from "next/link";
import { redirect } from "next/navigation";
import { Inbox } from "lucide-react";
import { getMe } from "@/lib/get-me";
import { getSessionToken } from "@/lib/session";
import { requireRole } from "@/lib/require-role";
import { GalleryGrid } from "@/components/admin/gallery-grid";

export const metadata = { title: "Gallery" };

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4311";

// How many items the team has dropped that are waiting for review. Best
// effort: the button still shows if this fails.
async function getDropCount(): Promise<number | null> {
  const token = await getSessionToken();
  if (!token) return null;
  try {
    const res = await fetch(`${API_URL}/photo-drop`, {
      cache: "no-store",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const { items } = (await res.json()) as { items: unknown[] };
    return items.length;
  } catch {
    return null;
  }
}

export default async function AdminGalleryPage() {
  const me = await getMe();
  if (!me) redirect("/admin/login");
  requireRole(me.role, ["OWNER", "MANAGER"]);
  const dropCount = await getDropCount();

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Gallery</h1>
          <p className="text-sm text-muted-foreground">
            Every photo uploaded anywhere in the admin lands here — this is the picker used for products and
            collections.
          </p>
        </div>
        <Link
          href="/admin/gallery/photo-drop"
          className="inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-sm font-medium hover:bg-muted"
        >
          <Inbox className="h-4 w-4" />
          Photo drop
          {dropCount ? (
            <span className="rounded-full bg-primary px-1.5 text-[11px] font-semibold text-primary-foreground">
              {dropCount} waiting
            </span>
          ) : null}
        </Link>
      </div>
      <div className="mt-7">
        <GalleryGrid tenantId={me.tenant.id} tenantName={me.tenant.name} />
      </div>
    </div>
  );
}
