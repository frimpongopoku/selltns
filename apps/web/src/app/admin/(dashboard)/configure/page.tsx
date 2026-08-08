import { redirect } from "next/navigation";
import { getStoryBlocks } from "@/lib/api";
import { getMe } from "@/lib/get-me";
import { requireRole } from "@/lib/require-role";
import { StoryEditor } from "@/components/admin/story-editor";
import { StorefrontCopyEditor } from "@/components/admin/storefront-copy-editor";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export const metadata = { title: "Configure pages" };

export default async function AdminConfigurePage() {
  const me = await getMe();
  if (!me) redirect("/admin/login");
  requireRole(me.role, ["OWNER", "MANAGER"]);
  const blocks = await getStoryBlocks(me.tenant.id);

  return (
    <div>
      <h1 className="text-2xl font-semibold">Configure pages</h1>
      <p className="text-sm text-muted-foreground">
        Edit the copy and content that appears across your storefront.
      </p>

      <div className="mt-7">
        <Tabs defaultValue="copy">
          <TabsList>
            <TabsTrigger value="copy">Storefront copy</TabsTrigger>
            <TabsTrigger value="story">Story page</TabsTrigger>
          </TabsList>

          <TabsContent value="copy" className="mt-6">
            <StorefrontCopyEditor tenant={me.tenant} />
          </TabsContent>

          <TabsContent value="story" className="mt-6">
            <p className="mb-5 text-sm text-muted-foreground">
              Arrange text, video and photo blocks for your public &ldquo;Our
              Story&rdquo; page — no ecommerce logic, just your brand&apos;s
              story.
            </p>
            <StoryEditor tenantId={me.tenant.id} blocks={blocks} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
