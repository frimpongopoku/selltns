import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { getMe } from "@/lib/get-me";
import { requireRole } from "@/lib/require-role";
import { PhotoDropManager } from "@/components/admin/photo-drop-manager";

export const metadata = { title: "Photo drop" };

export default async function AdminPhotoDropPage() {
  const me = await getMe();
  if (!me) redirect("/admin/login");
  requireRole(me.role, ["OWNER", "MANAGER"]);

  return (
    <div>
      <Link
        href="/admin/gallery"
        className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" />
        Gallery
      </Link>
      <h1 className="text-2xl font-semibold">Photo drop</h1>
      <p className="text-sm text-muted-foreground">
        Photos your team drops land here first. They only join your gallery or become products when you send them.
      </p>
      <div className="mt-7">
        <PhotoDropManager tenantId={me.tenant.id} />
      </div>
    </div>
  );
}
