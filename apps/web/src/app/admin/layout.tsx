export const metadata = { title: { template: "%s · Selltns Admin", default: "Selltns Admin" } };

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-full bg-muted/30">{children}</div>;
}
