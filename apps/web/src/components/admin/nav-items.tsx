import {
  LayoutDashboard,
  Package,
  Layers,
  Image as ImageIcon,
  ClipboardList,
  Wallet,
  Palette,
  Users,
  Globe,
  LayoutTemplate,
  Store,
  PackageSearch,
  ShieldCheck,
  CreditCard,
} from "lucide-react";
import type { Role } from "@/lib/types";
import { BILLING_ENABLED } from "@/lib/feature-flags";

// `roles` omitted = every role can see it. Kept in sync with the backend
// role matrix (apps/api's per-route @Roles(...) — see products/collections/
// media/payment-methods/story/team/tenants controllers): this is UX
// convenience (hide what a role can't use), the API is the real gate.
export const NAV_ITEMS = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/products", label: "Products", icon: Package },
  { href: "/admin/collections", label: "Collections", icon: Layers, roles: ["OWNER", "MANAGER"] as Role[] },
  { href: "/admin/preorders", label: "Pre-orders", icon: PackageSearch, roles: ["OWNER", "MANAGER"] as Role[] },
  { href: "/admin/gallery", label: "Gallery", icon: ImageIcon, roles: ["OWNER", "MANAGER"] as Role[] },
  { href: "/admin/orders", label: "Orders", icon: ClipboardList },
  { href: "/admin/payments", label: "Payment methods", icon: Wallet, roles: ["OWNER", "MANAGER"] as Role[] },
  { href: "/admin/configure", label: "Configure pages", icon: LayoutTemplate, roles: ["OWNER", "MANAGER"] as Role[] },
] as const;

export const SETTINGS_NAV_ITEMS = [
  { href: "/admin/verification", label: "Get verified", icon: ShieldCheck, roles: ["OWNER"] as Role[] },
  ...(BILLING_ENABLED
    ? [{ href: "/admin/upgrade", label: "Upgrade plan", icon: CreditCard, roles: ["OWNER"] as Role[] }]
    : []),
  { href: "/admin/settings/store", label: "Store profile", icon: Store, roles: ["OWNER"] as Role[] },
  { href: "/admin/settings/theme", label: "Storefront theme", icon: Palette, roles: ["OWNER"] as Role[] },
  { href: "/admin/settings/team", label: "Team & roles", icon: Users, roles: ["OWNER"] as Role[] },
] as const;

// Kept separate from SETTINGS_NAV_ITEMS and rendered under its own "Advanced"
// heading — custom domains involve DNS and aren't something most vendors
// need to touch, so they shouldn't sit alongside the everyday settings.
export const ADVANCED_NAV_ITEMS = [
  { href: "/admin/settings/domain", label: "Custom domain", icon: Globe, roles: ["OWNER"] as Role[] },
] as const;
