"use client";

import { useEffect, useRef } from "react";

// Attaches an IntersectionObserver to a sentinel element; calls onIntersect
// when it scrolls into view. `root` lets a scrollable container (e.g. a
// dialog panel) be used instead of the viewport.
export function useInfiniteScroll({
  onIntersect,
  enabled,
  root,
}: {
  onIntersect: () => void;
  enabled: boolean;
  root?: HTMLElement | null;
}) {
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!enabled) return;
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) onIntersect();
      },
      { root: root ?? null, rootMargin: "200px" },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [onIntersect, enabled, root]);

  return sentinelRef;
}
