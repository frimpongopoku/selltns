import { redirect } from "next/navigation";
import { getStoryBlocks } from "@/lib/api";
import { getMe } from "@/lib/get-me";
import { requireRole } from "@/lib/require-role";
import { StoryEditor } from "@/components/admin/story-editor";

export const metadata = { title: "Story page" };

export default async function AdminStoryPage() {
  const me = await getMe();
  if (!me) redirect("/admin/login");
  requireRole(me.role, ["OWNER", "MANAGER"]);
  const blocks = await getStoryBlocks(me.tenant.id);

  return (
    <div>
      <h1 className="text-2xl font-semibold">Story page</h1>
      <p className="text-sm text-muted-foreground">
        Arrange text, video and photo blocks for your public &ldquo;Our
        Story&rdquo; page — no ecommerce logic, just your brand&apos;s story.
      </p>
      <div className="mt-7">
        <StoryEditor tenantId={me.tenant.id} blocks={blocks} />
      </div>
    </div>
  );
}
