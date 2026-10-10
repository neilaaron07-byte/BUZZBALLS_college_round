import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: "LUMEN — Checkout incident demo",
  description: "A seeded production checkout failure for the PATCHWORK live-patching demo.",
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
  return <html lang="en"><body>{children}</body></html>;
}
