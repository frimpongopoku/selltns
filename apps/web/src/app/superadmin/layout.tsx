export const metadata = { title: { template: "%s · Superadmin", default: "Superadmin" } };

export default function SuperAdminRootLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
