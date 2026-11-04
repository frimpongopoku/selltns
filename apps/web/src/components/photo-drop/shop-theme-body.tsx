"use client";

import { useEffect } from "react";
import { themeStyle } from "@/components/theme/theme-scope";
import type { ThemeTokens } from "@/lib/types";

// Dialogs render outside the page (on <body>), so the shop's theme is copied
// onto <body> too while this page is open — otherwise they'd fall back to
// the plain admin look.
export function ShopThemeBody({ tokens }: { tokens: ThemeTokens }) {
  useEffect(() => {
    const body = document.body;
    const style = themeStyle(tokens) as Record<string, string>;
    body.dataset.template = tokens.template;
    body.classList.add("store-ui");
    for (const [name, value] of Object.entries(style)) body.style.setProperty(name, value);
    return () => {
      delete body.dataset.template;
      body.classList.remove("store-ui");
      for (const name of Object.keys(style)) body.style.removeProperty(name);
    };
  }, [tokens]);
  return null;
}
