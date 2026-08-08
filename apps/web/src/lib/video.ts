export type VideoPlatform = "youtube" | "tiktok";

export function getYouTubeEmbedUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes("youtu.be")) {
      return `https://www.youtube.com/embed${parsed.pathname}`;
    }
    if (parsed.hostname.includes("youtube.com")) {
      const id = parsed.searchParams.get("v");
      if (id) return `https://www.youtube.com/embed/${id}`;
      if (parsed.pathname.startsWith("/embed/")) return url;
      if (parsed.pathname.startsWith("/shorts/")) {
        const shortId = parsed.pathname.split("/")[2];
        if (shortId) return `https://www.youtube.com/embed/${shortId}`;
      }
    }
    return null;
  } catch {
    return null;
  }
}

/** Thumbnail for a YouTube video — TikTok has no equivalent public URL scheme. */
export function getYouTubeThumbnailUrl(url: string): string | null {
  const embedUrl = getYouTubeEmbedUrl(url);
  if (!embedUrl) return null;
  const id = embedUrl.split("/embed/")[1];
  return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null;
}

export function isYouTubeShort(url: string): boolean {
  try {
    return new URL(url).pathname.startsWith("/shorts/");
  } catch {
    return false;
  }
}

/** True for the canonical `tiktok.com/@user/video/<id>` form (short share
 * links need resolving first — see `/api/resolve-video-url`). */
export function getTikTokVideoId(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (!parsed.hostname.endsWith("tiktok.com")) return null;
    const match = parsed.pathname.match(/\/video\/(\d+)/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

export function getTikTokEmbedUrl(url: string): string | null {
  const id = getTikTokVideoId(url);
  return id ? `https://www.tiktok.com/embed/v2/${id}` : null;
}

/** `vm.tiktok.com` / `vt.tiktok.com` share links carry an opaque code, not a
 * video ID — they need a redirect followed server-side before they're
 * embeddable. See `/api/resolve-video-url`. */
export function isShortTikTokLink(url: string): boolean {
  try {
    const host = new URL(url).hostname;
    return host === "vm.tiktok.com" || host === "vt.tiktok.com";
  } catch {
    return false;
  }
}

/** Resolves a vm.tiktok.com/vt.tiktok.com share link to its canonical,
 * embeddable tiktok.com/@user/video/<id> form via our own server route
 * (avoids a cross-origin fetch straight to TikTok from the browser). */
export async function resolveTikTokShortLink(url: string): Promise<string> {
  const res = await fetch(`/api/resolve-video-url?url=${encodeURIComponent(url)}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.message ?? "Couldn't resolve this link");
  return data.resolvedUrl as string;
}

export function detectVideoPlatform(url: string): VideoPlatform | null {
  try {
    const host = new URL(url).hostname;
    if (host.includes("youtube.com") || host === "youtu.be") return "youtube";
    if (host.endsWith("tiktok.com")) return "tiktok";
    return null;
  } catch {
    return null;
  }
}

export function getVideoEmbedUrl(url: string): string | null {
  const platform = detectVideoPlatform(url);
  if (platform === "youtube") return getYouTubeEmbedUrl(url);
  if (platform === "tiktok") return getTikTokEmbedUrl(url);
  return null;
}

/** TikTok and YouTube Shorts are shot vertically — everything else (regular
 * YouTube) is the usual horizontal 16:9. Drives which aspect-ratio box the
 * player renders in so it never looks stretched or letterboxed oddly. */
export function isVerticalVideo(url: string): boolean {
  const platform = detectVideoPlatform(url);
  if (platform === "tiktok") return true;
  if (platform === "youtube") return isYouTubeShort(url);
  return false;
}
