"use client";

import { createContext, useContext } from "react";
import { storeHref } from "@/lib/store-href";

interface StoreContextValue {
  slug: string;
  isCustomDomain: boolean;
}

const StoreContext = createContext<StoreContextValue | null>(null);

export function StoreProvider({
  slug,
  isCustomDomain,
  children,
}: {
  slug: string;
  isCustomDomain: boolean;
  children: React.ReactNode;
}) {
  return (
    <StoreContext.Provider value={{ slug, isCustomDomain }}>{children}</StoreContext.Provider>
  );
}

function useStoreContext() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStoreSlug must be used within StoreProvider");
  return ctx;
}

export function useStoreSlug() {
  return useStoreContext().slug;
}

// Builds a link to another page within this storefront — see storeHref()
// for why the slug prefix has to be dropped on a connected custom domain.
export function useStoreHref(path = "") {
  const { slug, isCustomDomain } = useStoreContext();
  return storeHref(slug, isCustomDomain, path);
}

// Same as useStoreHref, but returns a builder function instead of a single
// href — for call sites that only know the target path at event-handler
// time (e.g. router.push after an async submit), where a hook can't be
// called with a not-yet-known argument.
export function useStoreLinkBuilder() {
  const { slug, isCustomDomain } = useStoreContext();
  return (path = "") => storeHref(slug, isCustomDomain, path);
}
