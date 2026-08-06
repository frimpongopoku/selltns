"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getProductsPage } from "./api";
import type { Product } from "./types";

const PAGE_SIZE = 24;
const SEARCH_DEBOUNCE_MS = 350;

export type ProductStatusFilter = "all" | "active" | "inactive";

export function useProductLibrary(tenantId: string) {
  const [products, setProducts] = useState<Product[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<ProductStatusFilter>("all");
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
    getProductsPage(tenantId, {
      limit: PAGE_SIZE,
      q: debouncedQuery || undefined,
      status,
      tag: tag || undefined,
    })
      .then((page) => {
        if (requestId.current !== id) return;
        setProducts(page.items);
        setCursor(page.nextCursor);
        setHasMore(page.nextCursor !== null);
      })
      .finally(() => {
        if (requestId.current === id) setLoading(false);
      });
  }, [tenantId, debouncedQuery, status, tag]);

  useEffect(() => {
    reload();
  }, [reload]);

  const loadMore = useCallback(() => {
    if (!cursor || loading || loadingMore) return;
    const id = ++requestId.current;
    setLoadingMore(true);
    getProductsPage(tenantId, {
      limit: PAGE_SIZE,
      cursor,
      q: debouncedQuery || undefined,
      status,
      tag: tag || undefined,
    })
      .then((page) => {
        if (requestId.current !== id) return;
        setProducts((prev) => [...prev, ...page.items]);
        setCursor(page.nextCursor);
        setHasMore(page.nextCursor !== null);
      })
      .finally(() => {
        if (requestId.current === id) setLoadingMore(false);
      });
  }, [tenantId, cursor, loading, loadingMore, debouncedQuery, status, tag]);

  const prepend = useCallback((product: Product) => {
    setProducts((prev) => [product, ...prev]);
  }, []);

  const updateProductInList = useCallback((updated: Product) => {
    setProducts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
  }, []);

  const removeProduct = useCallback((id: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== id));
  }, []);

  return {
    products,
    loading,
    loadingMore,
    hasMore,
    loadMore,
    query,
    setQuery,
    status,
    setStatus,
    tag,
    setTag,
    prepend,
    updateProductInList,
    removeProduct,
    reload,
  };
}
