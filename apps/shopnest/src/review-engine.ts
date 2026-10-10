import type { Product } from "./types";

export type Review = {
  id: string;
  productSlug: string;
  author: string;
  initials: string;
  rating: 1 | 2 | 3 | 4 | 5;
  title: string;
  body: string;
  verified: boolean;
  date: string;
  helpful: number;
  tags: string[];
};

export type ReviewSummary = {
  average: number;
  total: number;
  distribution: Record<1 | 2 | 3 | 4 | 5, number>;
  verifiedPercent: number;
  topTags: string[];
};

export const reviews: Review[] = [
  { id: "rev_aurora_001", productSlug: "aurora-headphones", author: "Elena Rossi", initials: "ER", rating: 5, title: "The room gets quieter", body: "The fit disappears after a few minutes and the battery has carried every flight this month. Calls stay clear without making my voice sound like a tunnel.", verified: true, date: "Oct 8, 2026", helpful: 42, tags: ["comfort", "battery", "calls"] },
  { id: "rev_aurora_002", productSlug: "aurora-headphones", author: "Maya Chen", initials: "MC", rating: 5, title: "A calm desk companion", body: "I bought these for deep work. The controls are restrained, the hinge feels solid, and the graphite finish has not picked up fingerprints.", verified: true, date: "Sep 29, 2026", helpful: 31, tags: ["desk", "finish", "comfort"] },
  { id: "rev_aurora_003", productSlug: "aurora-headphones", author: "Jon Bell", initials: "JB", rating: 4, title: "Excellent, with one small note", body: "Sound and isolation are excellent. The case is a little wider than my old pair, but it still fits the front pocket of my pack.", verified: true, date: "Sep 14, 2026", helpful: 19, tags: ["sound", "travel"] },
  { id: "rev_field_001", productSlug: "field-speaker", author: "Priya Nair", initials: "PN", rating: 5, title: "The kitchen finally has a soundtrack", body: "Warm at low volume and surprisingly present when the room fills up. It has replaced three smaller speakers in our apartment.", verified: true, date: "Oct 2, 2026", helpful: 26, tags: ["sound", "home"] },
  { id: "rev_field_002", productSlug: "field-speaker", author: "Owen Walsh", initials: "OW", rating: 4, title: "Good-looking and easy to move", body: "The handle is useful, setup is quick, and the clay color is exactly as pictured. I would love a slightly longer cable.", verified: true, date: "Aug 26, 2026", helpful: 12, tags: ["design", "setup"] },
  { id: "rev_arc_001", productSlug: "arc-desk-lamp", author: "Sofia Marin", initials: "SM", rating: 5, title: "The light is kind to late work", body: "The dimming range is wide without feeling fiddly. The base takes less desk space than my old lamp and feels much more stable.", verified: false, date: "Sep 17, 2026", helpful: 15, tags: ["light", "desk"] },
  { id: "rev_still_001", productSlug: "still-bottle", author: "Theo Grant", initials: "TG", rating: 5, title: "Actually leakproof", body: "It survived a week of train commutes in the same pocket as my notebook. The mouth is comfortable and the finish does not get slippery.", verified: true, date: "Oct 5, 2026", helpful: 33, tags: ["travel", "finish"] },
];

export function reviewsForProduct(product: Product | string): Review[] {
  const slug = typeof product === "string" ? product : product.slug;
  return reviews.filter((review) => review.productSlug === slug);
}

export function reviewSummary(product: Product | string): ReviewSummary {
  const source = reviewsForProduct(product);
  const distribution: Record<1 | 2 | 3 | 4 | 5, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  const tagCounts = new Map<string, number>();
  let verified = 0;
  for (const review of source) {
    distribution[review.rating] += 1;
    if (review.verified) verified += 1;
    for (const tag of review.tags) tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
  }
  const total = source.length;
  const average = total ? Number((source.reduce((sum, review) => sum + review.rating, 0) / total).toFixed(2)) : 0;
  const topTags = [...tagCounts.entries()].sort((first, second) => second[1] - first[1] || first[0].localeCompare(second[0])).slice(0, 3).map(([tag]) => tag);
  return { average, total, distribution, verifiedPercent: total ? Math.round((verified / total) * 100) : 0, topTags };
}

export function sortedReviews(product: Product | string, sort: "recent" | "helpful" | "highest" | "lowest" = "recent"): Review[] {
  return reviewsForProduct(product).sort((first, second) => sort === "helpful" ? second.helpful - first.helpful : sort === "highest" ? second.rating - first.rating : sort === "lowest" ? first.rating - second.rating : second.date.localeCompare(first.date));
}

export function filterReviews(product: Product | string, rating: "all" | 1 | 2 | 3 | 4 | 5, verifiedOnly = false): Review[] {
  return sortedReviews(product).filter((review) => (rating === "all" || review.rating === rating) && (!verifiedOnly || review.verified));
}

export function ratingBarWidth(summary: ReviewSummary, rating: 1 | 2 | 3 | 4 | 5): number {
  return summary.total ? Math.round((summary.distribution[rating] / summary.total) * 100) : 0;
}

export function reviewLabel(review: Review): string {
  return `${review.rating} out of 5 from ${review.author}`;
}

export function responseToReview(review: Review): string {
  if (review.rating === 5) return `Thank you, ${review.author.split(" ")[0]}. We are glad ${review.tags[0] ?? "the details"} is working for you.`;
  if (review.rating >= 4) return `Thanks for the thoughtful note, ${review.author.split(" ")[0]}. We are tracking the detail you called out.`;
  return `We are sorry this missed the mark, ${review.author.split(" ")[0]}. Our support team can help make it right.`;
}
