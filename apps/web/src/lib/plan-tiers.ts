import type { PlanTier } from "./types";

export interface PlanTierInfo {
  tier: PlanTier;
  name: string;
  priceGhs: number;
  priceLabel: string;
  for: string;
  features: string[];
}

export const PLAN_TIERS: PlanTierInfo[] = [
  {
    tier: "FREE",
    name: "Free",
    priceGhs: 0,
    priceLabel: "GHS 0/mo",
    for: "for shops just getting started",
    features: [
      "1 store",
      "Up to 20 active products",
      "Subdomain only (selltns.com/yourshop)",
      "1 team seat (just you)",
      '"Powered by Selltns" footer badge',
      "All 3 storefront themes",
    ],
  },
  {
    tier: "GROWTH",
    name: "Growth",
    priceGhs: 70,
    priceLabel: "GHS 70/mo",
    for: "for a shop that's actually selling",
    features: [
      "Up to 150 active products",
      "Unlimited collections & pre-orders",
      "Connect a custom domain",
      "Up to 3 team seats",
      "Remove the Selltns badge",
      "Sales trends over time",
    ],
  },
  {
    tier: "PRO",
    name: "Pro",
    priceGhs: 190,
    priceLabel: "GHS 190/mo",
    for: "for multi-store owners & serious operators",
    features: [
      "Unlimited products",
      "3 stores included",
      "Unlimited team seats",
      "Best-sellers & repeat-customer analytics",
      "CSV export of products & orders",
      "Priority WhatsApp support",
    ],
  },
];

export const PLAN_LABEL: Record<PlanTier, string> = {
  FREE: "Free",
  GROWTH: "Growth",
  PRO: "Pro",
};
