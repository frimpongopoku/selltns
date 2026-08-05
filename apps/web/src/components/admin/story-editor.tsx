"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowDown,
  ArrowUp,
  ImagePlus,
  Plus,
  Trash2,
  Type,
  Video,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { GalleryPicker } from "@/components/admin/gallery-picker";
import { updateStoryBlocks } from "@/lib/api";
import type { ContentBlock, ContentBlockType } from "@/lib/types";

const BLOCK_META: Record<ContentBlockType, { label: string; icon: typeof Type }> = {
  TEXT: { label: "Text", icon: Type },
  VIDEO: { label: "Video", icon: Video },
  PHOTOS: { label: "Photos", icon: ImagePlus },
};

function newBlock(type: ContentBlockType, tenantId: string): ContentBlock {
  const id = `block_${Date.now()}_${Math.round(Math.random() * 1000)}`;
  if (type === "TEXT") return { id, tenantId, type, heading: "", body: "" };
  if (type === "VIDEO") return { id, tenantId, type, videoUrl: "", caption: "" };
  return { id, tenantId, type, heading: "", imageUrls: [] };
}

export function StoryEditor({
  tenantId,
  blocks: initialBlocks,
}: {
  tenantId: string;
  blocks: ContentBlock[];
}) {
  const router = useRouter();
  const [blocks, setBlocks] = useState(initialBlocks);
  const [saving, setSaving] = useState(false);

  function updateBlock(id: string, patch: Partial<ContentBlock>) {
    setBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  }

  function removeBlock(id: string) {
    setBlocks((prev) => prev.filter((b) => b.id !== id));
  }

  function moveBlock(id: string, direction: -1 | 1) {
    setBlocks((prev) => {
      const index = prev.findIndex((b) => b.id === id);
      const target = index + direction;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function addBlock(type: ContentBlockType) {
    setBlocks((prev) => [...prev, newBlock(type, tenantId)]);
  }

  async function handleSave() {
    setSaving(true);
    try {
      await updateStoryBlocks(tenantId, blocks);
      toast.success("Story page updated");
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex max-w-2xl flex-col gap-5">
      {blocks.map((block, i) => (
        <Card
          key={block.id}
          className="animate-in fade-in-0 slide-in-from-bottom-1 gap-4 p-5 duration-300"
        >
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              {(() => {
                const Icon = BLOCK_META[block.type].icon;
                return <Icon className="h-4 w-4" />;
              })()}
              {BLOCK_META[block.type].label} block
            </span>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                disabled={i === 0}
                onClick={() => moveBlock(block.id, -1)}
                aria-label="Move up"
              >
                <ArrowUp className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                disabled={i === blocks.length - 1}
                onClick={() => moveBlock(block.id, 1)}
                aria-label="Move down"
              >
                <ArrowDown className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => removeBlock(block.id)}
                aria-label="Remove block"
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {block.type === "TEXT" && (
            <div className="flex flex-col gap-3">
              <div>
                <Label>Heading</Label>
                <Input
                  className="mt-1.5"
                  value={block.heading ?? ""}
                  onChange={(e) => updateBlock(block.id, { heading: e.target.value })}
                  placeholder="Behind the brand"
                />
              </div>
              <div>
                <Label>Body</Label>
                <Textarea
                  className="mt-1.5"
                  rows={4}
                  value={block.body ?? ""}
                  onChange={(e) => updateBlock(block.id, { body: e.target.value })}
                  placeholder="Tell your story…"
                />
              </div>
            </div>
          )}

          {block.type === "VIDEO" && (
            <div className="flex flex-col gap-3">
              <div>
                <Label>Video URL</Label>
                <Input
                  className="mt-1.5"
                  value={block.videoUrl ?? ""}
                  onChange={(e) => updateBlock(block.id, { videoUrl: e.target.value })}
                  placeholder="https://youtube.com/watch?v=…"
                />
              </div>
              <div>
                <Label>Caption</Label>
                <Input
                  className="mt-1.5"
                  value={block.caption ?? ""}
                  onChange={(e) => updateBlock(block.id, { caption: e.target.value })}
                  placeholder="A day in the studio"
                />
              </div>
            </div>
          )}

          {block.type === "PHOTOS" && (
            <div className="flex flex-col gap-3">
              <div>
                <Label>Heading (optional)</Label>
                <Input
                  className="mt-1.5"
                  value={block.heading ?? ""}
                  onChange={(e) => updateBlock(block.id, { heading: e.target.value })}
                  placeholder="In the studio"
                />
              </div>
              <div>
                <Label>Photos</Label>
                <div className="mt-1.5">
                  <GalleryPicker
                    tenantId={tenantId}
                    selected={block.imageUrls ?? []}
                    onChange={(urls) => updateBlock(block.id, { imageUrls: urls })}
                  />
                </div>
              </div>
            </div>
          )}
        </Card>
      ))}

      {blocks.length === 0 && (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          No content blocks yet — add one below to start building your story page.
        </Card>
      )}

      <div className="flex items-center justify-between">
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button type="button" variant="outline" className="gap-1.5" />}>
            <Plus className="h-4 w-4" />
            Add block
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            {(Object.keys(BLOCK_META) as ContentBlockType[]).map((type) => {
              const Icon = BLOCK_META[type].icon;
              return (
                <DropdownMenuItem key={type} onClick={() => addBlock(type)} className="gap-2">
                  <Icon className="h-4 w-4" />
                  {BLOCK_META[type].label}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>

        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Saving…" : "Publish changes"}
        </Button>
      </div>
    </div>
  );
}
