import type { CSSProperties, ReactNode } from "react";
import type { ThemeTokens } from "@/lib/types";

export function themeStyle(tokens: ThemeTokens): CSSProperties {
  return {
    "--store-primary-custom": tokens.primary,
    "--store-accent-custom": tokens.accent,
    "--store-font-heading": tokens.fontHeading,
    "--store-font-body": tokens.fontBody,
    "--store-radius": tokens.radius,
  } as CSSProperties;
}

export function ThemeScope({
  tokens,
  className,
  children,
}: {
  tokens: ThemeTokens;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      data-template={tokens.template}
      className={`bg-[var(--store-bg)] text-[var(--store-fg)] font-[family-name:var(--store-font-body)] transition-colors duration-200 min-h-full ${className ?? ""}`}
      style={themeStyle(tokens)}
    >
      {children}
    </div>
  );
}
