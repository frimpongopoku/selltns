"use client";

import { createContext, useContext } from "react";

const StoreContext = createContext<string | null>(null);

export function StoreProvider({
  slug,
  children,
}: {
  slug: string;
  children: React.ReactNode;
}) {
  return <StoreContext.Provider value={slug}>{children}</StoreContext.Provider>;
}

export function useStoreSlug() {
  const slug = useContext(StoreContext);
  if (!slug) throw new Error("useStoreSlug must be used within StoreProvider");
  return slug;
}
