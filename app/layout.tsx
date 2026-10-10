import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: "PATCHWORK — Repair. Verify. Release.",
  description: "A safe hotfix layer for frontend teams. Patch live websites, verify changes in isolation, and release with a rewind button.",
  openGraph: {
    title: "PATCHWORK — Repair. Verify. Release.",
    description: "A safe hotfix layer for frontend teams.",
    images: [{ url: "/og.png", width: 1734, height: 907, alt: "PATCHWORK product preview" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "PATCHWORK — Repair. Verify. Release.",
    description: "A safe hotfix layer for frontend teams.",
    images: ["/og.png"],
  },
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
