import type { Product, ProductCategory, ReleaseFixture, ReleaseMode } from "./types";

export const categories: Array<{ id: ProductCategory; label: string; detail: string }> = [
  { id: "audio", label: "Audio", detail: "Quiet rooms. Clear signal." },
  { id: "desk", label: "Desk", detail: "Tools for focused work." },
  { id: "travel", label: "Travel", detail: "Lightweight, considered carry." },
  { id: "wellness", label: "Wellness", detail: "Small rituals, better days." },
];

export const products: Product[] = [
  { slug: "aurora-headphones", name: "Aurora headphones", category: "audio", eyebrow: "NEW / 2026", description: "Quiet the noise. Keep the signal.", priceCents: 24800, compareAtCents: 28900, rating: 4.9, reviewCount: 128, colors: ["#202c30", "#c6bba7", "#d6e0de"], finish: "Graphite", delivery: "Ships today · arrives Thu, Oct 15", stockLabel: "Only 8 left", art: "headphones", featured: true },
  { slug: "field-speaker", name: "Field speaker", category: "audio", eyebrow: "BESTSELLER", description: "Room-filling sound in a smaller footprint.", priceCents: 16800, compareAtCents: 18900, rating: 4.8, reviewCount: 86, colors: ["#e4c7a3", "#283337", "#d9ded9"], finish: "Clay", delivery: "Ships tomorrow · arrives Fri, Oct 16", stockLabel: "In stock", art: "speaker", featured: true },
  { slug: "arc-desk-lamp", name: "Arc desk lamp", category: "desk", eyebrow: "STUDIO EDITION", description: "A softer light for sharper thinking.", priceCents: 12400, rating: 4.7, reviewCount: 64, colors: ["#cad4db", "#c4a87f", "#20292d"], finish: "Mist", delivery: "Ships in 2 days · arrives Sat, Oct 17", stockLabel: "In stock", art: "lamp", featured: true },
  { slug: "atlas-carry", name: "Atlas carry", category: "travel", eyebrow: "FIELD TESTED", description: "A daily pack with room for the long way home.", priceCents: 19200, rating: 4.9, reviewCount: 43, colors: ["#2a3235", "#8c765f", "#cdd7d1"], finish: "Olive black", delivery: "Ships today · arrives Thu, Oct 15", stockLabel: "In stock", art: "bag", featured: true },
  { slug: "still-bottle", name: "Still bottle", category: "wellness", eyebrow: "EVERYDAY", description: "Cold for 24 hours. Quietly well made.", priceCents: 4200, rating: 4.8, reviewCount: 211, colors: ["#bbcdd0", "#e3c7b5", "#293437"], finish: "Glacier", delivery: "Ships today · arrives Thu, Oct 15", stockLabel: "In stock", art: "bottle", featured: false },
  { slug: "studio-keys", name: "Studio keys", category: "desk", eyebrow: "NEW / LOW PROFILE", description: "A satisfying home for your most used words.", priceCents: 14900, rating: 4.6, reviewCount: 39, colors: ["#e7e1d7", "#363e41", "#9eabb0"], finish: "Warm white", delivery: "Ships in 2 days · arrives Sat, Oct 17", stockLabel: "Only 12 left", art: "keyboard", featured: false },
  { slug: "cloud-travel-pillow", name: "Cloud travel pillow", category: "travel", eyebrow: "REST / 01", description: "The soft landing between here and there.", priceCents: 6800, rating: 4.5, reviewCount: 72, colors: ["#ddd6c8", "#73868a", "#9b7770"], finish: "Sand", delivery: "Ships tomorrow · arrives Fri, Oct 16", stockLabel: "In stock", art: "bag", featured: false },
  { slug: "morrow-mat", name: "Morrow mat", category: "wellness", eyebrow: "RITUAL / 04", description: "A grounded start to the next hour.", priceCents: 8800, rating: 4.7, reviewCount: 55, colors: ["#b9c3ad", "#b68c7c", "#b9b5a6"], finish: "Moss", delivery: "Ships in 2 days · arrives Sat, Oct 17", stockLabel: "In stock", art: "bottle", featured: false },
];

export const releases: Record<ReleaseMode, ReleaseFixture> = {
  v1: {
    mode: "v1", label: "Healthy release", version: "shopnest-2026.10.10.1", summary: "The baseline storefront is healthy. The purchase action is visible, reachable, and ready for a clean scan.",
    signals: [{ tone: "green", label: "Purchase path", detail: "Add to cart responds in 380ms." }, { tone: "green", label: "Accessibility", detail: "Contrast and keyboard order pass." }, { tone: "green", label: "Console", detail: "No errors in the last replay." }], scannerFindings: [],
  },
  v2: {
    mode: "v2", label: "Breaking release", version: "shopnest-2026.10.10.2", summary: "A storefront refactor shipped four small regressions. PATCHWORK keeps each finding tied to a target and inverse.",
    signals: [{ tone: "red", label: "Purchase path", detail: "A stale promo layer intercepts Add to cart." }, { tone: "amber", label: "Contrast", detail: "The price label is below WCAG AA." }, { tone: "amber", label: "Content", detail: "The legal page still contains last season's return copy." }], scannerFindings: ["hidden-buy-button", "low-contrast-price", "stale-return-copy", "duplicate-purchase-action"], activePatch: "pw_0042",
  },
  v3: {
    mode: "v3", label: "Refactor release", version: "shopnest-2026.10.10.3", summary: "The DOM moved under a new wrapper and two purchase buttons now share the same label. Smart tracking must stop before guessing.",
    signals: [{ tone: "amber", label: "Target identity", detail: "The old fingerprint found two semantic candidates." }, { tone: "red", label: "Automatic apply", detail: "Blocked until a reviewer resolves the ambiguity." }, { tone: "green", label: "Rollback", detail: "The last healthy manifest is still available." }], scannerFindings: ["moved-target", "ambiguous-target", "wrapper-refactor"], activePatch: "pw_0042",
  },
};

export function getProduct(slug: string): Product {
  return products.find((product) => product.slug === slug) ?? products[0]!;
}

export function formatPrice(priceCents: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(priceCents / 100);
}

export function formatRating(rating: number): string {
  return rating.toFixed(1);
}

export function searchCatalog(query: string, category: ProductCategory | "all"): Product[] {
  const normalized = query.trim().toLowerCase();
  return products.filter((product) => {
    const matchesCategory = category === "all" || product.category === category;
    const matchesQuery = !normalized || [product.name, product.eyebrow, product.description, product.category].join(" ").toLowerCase().includes(normalized);
    return matchesCategory && matchesQuery;
  });
}

export function priceMatches(priceCents: number, range: "all" | "under-100" | "100-200" | "over-200"): boolean {
  if (range === "under-100") return priceCents < 10000;
  if (range === "100-200") return priceCents >= 10000 && priceCents <= 20000;
  if (range === "over-200") return priceCents > 20000;
  return true;
}

export function releaseFor(mode: ReleaseMode): ReleaseFixture {
  return releases[mode];
}
