"use client";

import { useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { Loader2, Plus, Video, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  detectVideoPlatform,
  getTikTokVideoId,
  getYouTubeEmbedUrl,
  getYouTubeThumbnailUrl,
  isShortTikTokLink,
  resolveTikTokShortLink,
} from "@/lib/video";

const MAX_VIDEOS = 5;
const PLATFORM_LABEL = { youtube: "YouTube", tiktok: "TikTok" } as const;

export function VideoLinksInput({
  videos,
  onChange,
}: {
  videos: string[];
  onChange: (videos: string[]) => void;
}) {
  const [draft, setDraft] = useState("");
  const [resolving, setResolving] = useState(false);

  function removeAt(url: string) {
    onChange(videos.filter((v) => v !== url));
  }

  async function handleAdd() {
    const raw = draft.trim();
    if (!raw) return;
    if (videos.length >= MAX_VIDEOS) {
      toast.error(`You can add up to ${MAX_VIDEOS} videos.`);
      return;
    }
    if (videos.includes(raw)) {
      toast.error("That video's already added.");
      setDraft("");
      return;
    }

    const platform = detectVideoPlatform(raw);
    if (!platform) {
      toast.error("Only YouTube or TikTok links are supported.");
      return;
    }

    if (platform === "youtube") {
      if (!getYouTubeEmbedUrl(raw)) {
        toast.error("Couldn't read that YouTube link.");
        return;
      }
      onChange([...videos, raw]);
      setDraft("");
      return;
    }

    // TikTok — share-sheet links (vm./vt.tiktok.com) need resolving to their
    // canonical /video/<id> form before they're embeddable.
    if (isShortTikTokLink(raw)) {
      setResolving(true);
      try {
        const resolved = await resolveTikTokShortLink(raw);
        if (!getTikTokVideoId(resolved)) {
          toast.error("Couldn't read that TikTok link. Try pasting the full video link instead.");
          return;
        }
        if (videos.includes(resolved)) {
          toast.error("That video's already added.");
          return;
        }
        onChange([...videos, resolved]);
        setDraft("");
      } catch {
        toast.error("Couldn't resolve that TikTok link. Try pasting the full video link instead.");
      } finally {
        setResolving(false);
      }
      return;
    }

    if (!getTikTokVideoId(raw)) {
      toast.error("Couldn't read that TikTok link — open the video and copy the link from the address bar.");
      return;
    }
    onChange([...videos, raw]);
    setDraft("");
  }

  return (
    <div className="flex flex-col gap-3">
      {videos.length > 0 && (
        <div className="flex flex-col gap-2">
          {videos.map((url) => {
            const platform = detectVideoPlatform(url);
            const thumb = platform === "youtube" ? getYouTubeThumbnailUrl(url) : null;
            return (
              <div key={url} className="flex items-center gap-3 rounded-lg border p-2.5">
                <span className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted">
                  {thumb ? (
                    <Image src={thumb} alt="" fill sizes="36px" className="object-cover" />
                  ) : (
                    <Video className="h-4 w-4 text-muted-foreground" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium">
                    {platform ? PLATFORM_LABEL[platform] : "Video"}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">{url}</p>
                </div>
                <button
                  type="button"
                  onClick={() => removeAt(url)}
                  aria-label="Remove video"
                  className="shrink-0 rounded-full p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {videos.length < MAX_VIDEOS && (
        <div className="flex gap-2">
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAdd();
              }
            }}
            placeholder="Paste a YouTube or TikTok link…"
            disabled={resolving}
          />
          <Button type="button" variant="outline" onClick={handleAdd} disabled={resolving}>
            {resolving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          </Button>
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        {videos.length}/{MAX_VIDEOS} videos
      </p>
    </div>
  );
}
