import Image from "next/image";
import { notFound } from "next/navigation";
import { Play } from "lucide-react";
import { getStoryBlocks, getTenantBySlug } from "@/lib/api";
import { getYouTubeEmbedUrl } from "@/lib/video";

export const metadata = { title: "Our Story" };

export default async function StoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const tenant = await getTenantBySlug(slug).catch(() => null);
  if (!tenant) notFound();
  const blocks = await getStoryBlocks(tenant.id);

  return (
    <div className="pb-24">
      {blocks.map((block, i) => {
        const delay = `${Math.min(i, 6) * 60}ms`;

        if (block.type === "TEXT") {
          return (
            <section
              key={block.id}
              style={{ animationDelay: delay }}
              className="mx-auto max-w-3xl animate-in fade-in-0 slide-in-from-bottom-2 fill-mode-both px-4 py-16 text-center duration-500 sm:px-6 sm:py-20 lg:px-8"
            >
              {block.heading && (
                <h1 className="store-heading text-4xl leading-tight sm:text-5xl">
                  {block.heading}
                </h1>
              )}
              {block.body && (
                <p className="store-muted mx-auto mt-6 max-w-xl leading-relaxed">
                  {block.body}
                </p>
              )}
            </section>
          );
        }

        if (block.type === "VIDEO") {
          const embedUrl = block.videoUrl ? getYouTubeEmbedUrl(block.videoUrl) : null;
          return (
            <section
              key={block.id}
              style={{ animationDelay: delay }}
              className="mx-auto max-w-5xl animate-in fade-in-0 slide-in-from-bottom-2 fill-mode-both px-4 pb-16 duration-500 sm:px-6 lg:px-8"
            >
              <div className="store-card aspect-video overflow-hidden bg-black">
                {embedUrl ? (
                  <iframe
                    src={embedUrl}
                    title={block.caption ?? "Video"}
                    className="h-full w-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                ) : block.videoUrl ? (
                  <a
                    href={block.videoUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex h-full flex-col items-center justify-center gap-3 text-white/70 transition-colors hover:text-white"
                  >
                    <Play className="h-10 w-10" />
                    <span className="text-sm">Watch video</span>
                  </a>
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-white/50">
                    No video linked yet
                  </div>
                )}
              </div>
              {block.caption && (
                <p className="store-muted mt-3 text-sm">{block.caption}</p>
              )}
            </section>
          );
        }

        // PHOTOS
        const images = block.imageUrls ?? [];
        if (images.length === 0) return null;
        return (
          <section
            key={block.id}
            style={{ animationDelay: delay }}
            className="mx-auto max-w-5xl animate-in fade-in-0 slide-in-from-bottom-2 fill-mode-both px-4 pb-16 duration-500 sm:px-6 lg:px-8"
          >
            {block.heading && (
              <h2 className="store-heading text-2xl font-semibold">{block.heading}</h2>
            )}
            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {images.map((url, imgIndex) => (
                <div
                  key={url + imgIndex}
                  className="store-card relative aspect-square overflow-hidden transition-opacity hover:opacity-90"
                >
                  <Image
                    src={url}
                    alt=""
                    fill
                    sizes="(max-width: 768px) 33vw, 20vw"
                    className="object-cover object-top"
                  />
                </div>
              ))}
            </div>
          </section>
        );
      })}

      {blocks.length === 0 && (
        <p className="store-muted mx-auto max-w-lg px-4 py-24 text-center">
          This store hasn&apos;t shared their story yet.
        </p>
      )}
    </div>
  );
}
