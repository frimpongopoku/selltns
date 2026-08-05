"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getGallery } from "./api";
import type { MediaAsset } from "./types";

const PAGE_SIZE = 40;
const SEARCH_DEBOUNCE_MS = 350;

export function useMediaLibrary(tenantId: string, options?: { enabled?: boolean }) {
  const enabled = options?.enabled ?? true;
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [query, setQuery] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Debounced so typing doesn't fire a request per keystroke.
  const [debouncedQuery, setDebouncedQuery] = useState("");
  useEffect(() => {
    const handle = setTimeout(() => setDebouncedQuery(query), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [query]);

  // Guards against a slow, stale request overwriting a newer one when
  // filters change quickly.
  const requestId = useRef(0);

  const reload = useCallback(() => {
    if (!enabled) return;
    const id = ++requestId.current;
    setLoading(true);
    getGallery(tenantId, {
      limit: PAGE_SIZE,
      q: debouncedQuery || undefined,
      from: dateFrom || undefined,
      to: dateTo || undefined,
    })
      .then((page) => {
        if (requestId.current !== id) return;
        setAssets(page.items);
        setCursor(page.nextCursor);
        setHasMore(page.nextCursor !== null);
      })
      .finally(() => {
        if (requestId.current === id) setLoading(false);
      });
  }, [tenantId, enabled, debouncedQuery, dateFrom, dateTo]);

  useEffect(() => {
    reload();
  }, [reload]);

  const loadMore = useCallback(() => {
    if (!enabled || !cursor || loading || loadingMore) return;
    const id = ++requestId.current;
    setLoadingMore(true);
    getGallery(tenantId, {
      limit: PAGE_SIZE,
      cursor,
      q: debouncedQuery || undefined,
      from: dateFrom || undefined,
      to: dateTo || undefined,
    })
      .then((page) => {
        if (requestId.current !== id) return;
        setAssets((prev) => [...prev, ...page.items]);
        setCursor(page.nextCursor);
        setHasMore(page.nextCursor !== null);
      })
      .finally(() => {
        if (requestId.current === id) setLoadingMore(false);
      });
  }, [tenantId, enabled, cursor, loading, loadingMore, debouncedQuery, dateFrom, dateTo]);

  const prepend = useCallback((asset: MediaAsset) => {
    setAssets((prev) => [asset, ...prev]);
  }, []);

  const updateAsset = useCallback((updated: MediaAsset) => {
    setAssets((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
  }, []);

  const removeAsset = useCallback((id: string) => {
    setAssets((prev) => prev.filter((a) => a.id !== id));
  }, []);

  return {
    assets,
    loading,
    loadingMore,
    hasMore,
    loadMore,
    query,
    setQuery,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    prepend,
    updateAsset,
    removeAsset,
  };
}
