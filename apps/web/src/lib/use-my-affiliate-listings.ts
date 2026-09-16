"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getMyAffiliateListingsPage } from "./api";
import type { AffiliateListing } from "./types";

const PAGE_SIZE = 24;
const SEARCH_DEBOUNCE_MS = 350;

// Same search/pagination shape as useAffiliateListingLibrary, but merged
// across every shop the caller resells for at once (optionally narrowed to
// one via relationshipFilter) — backs the affiliate products page, the
// "everything I resell, from every shop, in one place" view.
export function useMyAffiliateListings(tenantId: string, relationshipFilter: string | null) {
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

  const requestId = useRef(0);

  const reload = useCallback(() => {
    const id = ++requestId.current;
    setLoading(true);
    getMyAffiliateListingsPage(tenantId, {
      limit: PAGE_SIZE,
      q: debouncedQuery || undefined,
      relationshipId: relationshipFilter ?? undefined,
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
  }, [tenantId, relationshipFilter, debouncedQuery]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    reload();
  }, [reload]);

  const loadMore = useCallback(() => {
    if (!cursor || loading || loadingMore) return;
    const id = ++requestId.current;
    setLoadingMore(true);
    getMyAffiliateListingsPage(tenantId, {
      limit: PAGE_SIZE,
      cursor,
      q: debouncedQuery || undefined,
      relationshipId: relationshipFilter ?? undefined,
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
  }, [tenantId, relationshipFilter, cursor, loading, loadingMore, debouncedQuery]);

  // Lets a row-level action (set price, toggle active) patch its item
  // in place after a successful save, without a full reload.
  function patchListing(id: string, patch: Partial<AffiliateListing>) {
    setListings((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  }

  return { listings, loading, loadingMore, hasMore, loadMore, query, setQuery, patchListing };
}
