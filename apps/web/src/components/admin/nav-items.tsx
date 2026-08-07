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
  BookOpen,
  Store,
  PackageSearch,
} from "lucide-react";

export const NAV_ITEMS = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/products", label: "Products", icon: Package },
  { href: "/admin/collections", label: "Collections", icon: Layers },
  { href: "/admin/preorders", label: "Pre-orders", icon: PackageSearch },
  { href: "/admin/gallery", label: "Gallery", icon: ImageIcon },
  { href: "/admin/orders", label: "Orders", icon: ClipboardList },
  { href: "/admin/payments", label: "Payment methods", icon: Wallet },
  { href: "/admin/story", label: "Story page", icon: BookOpen },
] as const;

export const SETTINGS_NAV_ITEMS = [
  { href: "/admin/settings/store", label: "Store profile", icon: Store },
  { href: "/admin/settings/theme", label: "Storefront theme", icon: Palette },
  { href: "/admin/settings/team", label: "Team & roles", icon: Users },
  { href: "/admin/settings/domain", label: "Domain", icon: Globe },
] as const;
