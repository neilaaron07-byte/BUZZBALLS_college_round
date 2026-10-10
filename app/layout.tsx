import type { Metadata } from "next";
import { GeistMono, GeistSans } from "geist/font";
import { ThemeProvider } from "../apps/dashboard/src/ui/theme-provider";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: "PATCHWORK — Fix any website in 60 seconds",
  description: "Scan, fix, and ship safe website patches with confidence.",
  openGraph: {
    title: "PATCHWORK — Safe live patches",
    description: "A seeded checkout incident, isolated preview, and fail-before/pass-after verification.",
    images: [{ url: "/og.png", width: 1734, height: 907, alt: "PATCHWORK product preview" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "PATCHWORK — Safe live patches",
    description: "A seeded checkout incident, isolated preview, and fail-before/pass-after verification.",
    images: ["/og.png"],
  },
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" suppressHydrationWarning><body className={`${GeistSans.variable} ${GeistMono.variable}`}><ThemeProvider>{children}</ThemeProvider></body></html>;
}
