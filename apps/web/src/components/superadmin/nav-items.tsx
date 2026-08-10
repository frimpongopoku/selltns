import { LayoutDashboard, ShieldCheck, Store, Users } from "lucide-react";

export const SUPERADMIN_NAV_ITEMS = [
  { href: "/superadmin", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/superadmin/verifications", label: "Verifications", icon: ShieldCheck },
  { href: "/superadmin/stores", label: "Stores", icon: Store },
  { href: "/superadmin/admins", label: "Admins", icon: Users },
] as const;
