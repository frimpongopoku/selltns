import type { Metadata } from "next";
import { Inter, Cormorant_Garamond, Manrope } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { PostHogTracker } from "@/components/analytics/posthog-tracker";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:4310";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Selltns — Storefronts for Ghanaian Sellers",
  description:
    "Set up a store, share one link, and get paid by Mobile Money or bank. Track every order from request to delivery — no card fees, no developer needed.",
  keywords: [
    "online store Ghana",
    "sell online Ghana",
    "Mobile Money checkout",
    "MTN MoMo store",
    "Ghana ecommerce platform",
    "WhatsApp shop Ghana",
    "custom domain storefront",
  ],
  openGraph: {
    siteName: "Selltns",
    type: "website",
    locale: "en_GH",
  },
  twitter: {
    card: "summary_large_image",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} ${cormorant.variable} ${manrope.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <PostHogTracker />
          {children}
          <Toaster position="bottom-right" />
        </ThemeProvider>
      </body>
    </html>
  );
}
