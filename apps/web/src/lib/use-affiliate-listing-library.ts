"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getAffiliateListingsPage } from "./api";
import type { AffiliateListing } from "./types";

const PAGE_SIZE = 24;
const SEARCH_DEBOUNCE_MS = 350;

// Same search/pagination shape as useProductLibrary, scoped to one
// affiliate relationship's resellable listings — lets a picker page
// through a large resold catalog (per owner) instead of loading it all
// at once. See AffiliateCollectionItemsManager.
export function useAffiliateListingLibrary(relationshipId: string, tenantId: string) {
  const [listings, setListings] = useState<AffiliateListing[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [query, setQuery] = useState("");

  const [debouncedQuery, setDebouncedQuery] = useState("");
  useEffect(() => {
    const handle = setTimeout(() => setDebouncedQuery(query), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [query]);

  // Guards against a slow, stale request overwriting a newer one when the
  // search query changes quickly.
  const requestId = useRef(0);

  const reload = useCallback(() => {
    const id = ++requestId.current;
    setLoading(true);
    getAffiliateListingsPage(relationshipId, tenantId, {
      limit: PAGE_SIZE,
      q: debouncedQuery || undefined,
    })
      .then((page) => {
        if (requestId.current !== id) return;
        setListings(page.items);
        setCursor(page.nextCursor);
        setHasMore(page.nextCursor !== null);
      })
      .finally(() => {
        if (requestId.current === id) setLoading(false);
      });
  }, [relationshipId, tenantId, debouncedQuery]);

  useEffect(() => {
    // Runs the initial (and every filter-driven re-) fetch — `reload`
    // itself is stable per render only for its actual dependencies
    // (relationshipId/tenantId/debouncedQuery), so this intentionally
    // re-triggers exactly when one of those changes, same shape as
    // useProductLibrary.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    reload();
  }, [reload]);

  const loadMore = useCallback(() => {
    if (!cursor || loading || loadingMore) return;
    const id = ++requestId.current;
    setLoadingMore(true);
    getAffiliateListingsPage(relationshipId, tenantId, {
      limit: PAGE_SIZE,
      cursor,
      q: debouncedQuery || undefined,
    })
      .then((page) => {
        if (requestId.current !== id) return;
        setListings((prev) => [...prev, ...page.items]);
        setCursor(page.nextCursor);
        setHasMore(page.nextCursor !== null);
      })
      .finally(() => {
        if (requestId.current === id) setLoadingMore(false);
      });
  }, [relationshipId, tenantId, cursor, loading, loadingMore, debouncedQuery]);

  return { listings, loading, loadingMore, hasMore, loadMore, query, setQuery };
}
