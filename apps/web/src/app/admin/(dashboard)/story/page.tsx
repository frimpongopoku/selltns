import { getStoryBlocks } from "@/lib/api";
import { StoryEditor } from "@/components/admin/story-editor";

export const metadata = { title: "Story page" };

export default async function AdminStoryPage() {
  const blocks = await getStoryBlocks();

  return (
    <div>
      <h1 className="text-2xl font-semibold">Story page</h1>
      <p className="text-sm text-muted-foreground">
        Arrange text, video and photo blocks for your public &ldquo;Our
        Story&rdquo; page — no ecommerce logic, just your brand&apos;s story.
      </p>
      <div className="mt-7">
        <StoryEditor blocks={blocks} />
      </div>
    </div>
  );
}
