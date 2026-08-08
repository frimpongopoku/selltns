import type { ContentBlock } from "./types";

/** A block only counts as "real" content if it has something to actually show. */
function hasContent(block: ContentBlock): boolean {
  switch (block.type) {
    case "TEXT":
      return !!(block.heading?.trim() || block.body?.trim());
    case "VIDEO":
      return !!(block.videoUrl?.trim() || block.caption?.trim());
    case "PHOTOS":
      return (block.imageUrls?.length ?? 0) > 0;
  }
}

export function meaningfulStoryBlocks(blocks: ContentBlock[]): ContentBlock[] {
  return blocks.filter(hasContent);
}

export function hasStoryContent(blocks: ContentBlock[]): boolean {
  return blocks.some(hasContent);
}
