"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const SEARCH_DEBOUNCE_MS = 350;

// Cursor-paginated list with a debounced search box — the shared loader for
// the product sheet's product list and gallery picker.
export function usePaged<T>(
  // Must be stable (wrap it in useCallback) — a new function reloads the list.
  fetchPage: (params: {
    cursor?: string | null;
    q?: string;
  }) => Promise<{ items: T[]; nextCursor: string | null }>,
) {
  const [items, setItems] = useState<T[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const requestId = useRef(0);

  useEffect(() => {
    const handle = setTimeout(
      () => setDebounced(query.trim()),
      SEARCH_DEBOUNCE_MS,
    );
    return () => clearTimeout(handle);
  }, [query]);

  const reload = useCallback(() => {
    const id = ++requestId.current;
    setLoading(true);
    fetchPage({ q: debounced || undefined })
      .then((page) => {
        if (requestId.current !== id) return;
        setItems(page.items);
        setCursor(page.nextCursor);
      })
      .catch(() => {
        if (requestId.current === id) setItems([]);
      })
      .finally(() => {
        if (requestId.current === id) setLoading(false);
      });
  }, [debounced, fetchPage]);

  useEffect(() => {
    // Fetching on load/search is what this effect is for; the loading flag
    // it sets is part of that.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    reload();
  }, [reload]);

  const loadMore = useCallback(() => {
    if (!cursor || loading || loadingMore) return;
    const id = ++requestId.current;
    setLoadingMore(true);
    fetchPage({ cursor, q: debounced || undefined })
      .then((page) => {
        if (requestId.current !== id) return;
        setItems((prev) => [...prev, ...page.items]);
        setCursor(page.nextCursor);
      })
      .finally(() => {
        if (requestId.current === id) setLoadingMore(false);
      });
  }, [cursor, loading, loadingMore, debounced, fetchPage]);

  return {
    items,
    setItems,
    loading,
    loadingMore,
    hasMore: cursor !== null,
    loadMore,
    query,
    setQuery,
    reload,
  };
}
