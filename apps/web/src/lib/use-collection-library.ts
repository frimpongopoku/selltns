"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getCollectionsPage } from "./api";
import type { CollectionWithProducts } from "./types";

const PAGE_SIZE = 12;
const SEARCH_DEBOUNCE_MS = 350;

export function useCollectionLibrary(tenantId: string) {
  const [collections, setCollections] = useState<CollectionWithProducts[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [query, setQuery] = useState("");
  const [tag, setTag] = useState<string | null>(null);

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
    const id = ++requestId.current;
    setLoading(true);
    getCollectionsPage(tenantId, {
      limit: PAGE_SIZE,
      q: debouncedQuery || undefined,
      tag: tag || undefined,
    })
      .then((page) => {
        if (requestId.current !== id) return;
        setCollections(page.items);
        setCursor(page.nextCursor);
        setHasMore(page.nextCursor !== null);
      })
      .finally(() => {
        if (requestId.current === id) setLoading(false);
      });
  }, [tenantId, debouncedQuery, tag]);

  useEffect(() => {
    reload();
  }, [reload]);

  const loadMore = useCallback(() => {
    if (!cursor || loading || loadingMore) return;
    const id = ++requestId.current;
    setLoadingMore(true);
    getCollectionsPage(tenantId, {
      limit: PAGE_SIZE,
      cursor,
      q: debouncedQuery || undefined,
      tag: tag || undefined,
    })
      .then((page) => {
        if (requestId.current !== id) return;
        setCollections((prev) => [...prev, ...page.items]);
        setCursor(page.nextCursor);
        setHasMore(page.nextCursor !== null);
      })
      .finally(() => {
        if (requestId.current === id) setLoadingMore(false);
      });
  }, [tenantId, cursor, loading, loadingMore, debouncedQuery, tag]);

  const prepend = useCallback((collection: CollectionWithProducts) => {
    setCollections((prev) => [collection, ...prev]);
  }, []);

  return {
    collections,
    loading,
    loadingMore,
    hasMore,
    loadMore,
    query,
    setQuery,
    tag,
    setTag,
    prepend,
  };
}
