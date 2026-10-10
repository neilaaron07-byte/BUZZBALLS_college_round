import { formatPrice, products } from "./catalog";
import type { Product, ProductCategory, SearchFilters } from "./types";

export type CatalogQuery = SearchFilters & {
  text: string;
};

export type CatalogSummary = {
  total: number;
  visible: number;
  averagePriceCents: number;
  averageRating: number;
  categoryCounts: Record<ProductCategory, number>;
};

export type ProductRecommendation = {
  product: Product;
  reason: string;
  score: number;
};

export function emptyCatalogQuery(): CatalogQuery {
  return { text: "", category: "all", price: "all", sort: "featured" };
}

export function normalizeCatalogQuery(value: Partial<CatalogQuery> | null | undefined): CatalogQuery {
  const category = value?.category;
  const price = value?.price;
  const sort = value?.sort;
  return {
    text: typeof value?.text === "string" ? value.text.trim() : "",
    category: category === "audio" || category === "desk" || category === "travel" || category === "wellness" ? category : "all",
    price: price === "under-100" || price === "100-200" || price === "over-200" ? price : "all",
    sort: sort === "price-low" || sort === "price-high" || sort === "rating" ? sort : "featured",
  };
}

export function parseCatalogQuery(search: string): CatalogQuery {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  return normalizeCatalogQuery({ text: params.get("q") ?? "", category: params.get("category") as CatalogQuery["category"], price: params.get("price") as CatalogQuery["price"], sort: params.get("sort") as CatalogQuery["sort"] });
}

export function serializeCatalogQuery(query: CatalogQuery): string {
  const params = new URLSearchParams();
  if (query.text) params.set("q", query.text);
  if (query.category !== "all") params.set("category", query.category);
  if (query.price !== "all") params.set("price", query.price);
  if (query.sort !== "featured") params.set("sort", query.sort);
  const value = params.toString();
  return value ? `?${value}` : "";
}

function textScore(product: Product, text: string): number {
  const query = text.trim().toLowerCase();
  if (!query) return 0;
  const fields = [product.name.toLowerCase(), product.description.toLowerCase(), product.category, product.eyebrow.toLowerCase()];
  return fields.reduce((score, field, index) => score + (field === query ? 10 : field.startsWith(query) ? 6 - index : field.includes(query) ? 3 - index * .25 : 0), 0);
}

export function matchesPrice(priceCents: number, range: CatalogQuery["price"]): boolean {
  if (range === "under-100") return priceCents < 10000;
  if (range === "100-200") return priceCents >= 10000 && priceCents <= 20000;
  if (range === "over-200") return priceCents > 20000;
  return true;
}

export function matchesCatalogQuery(product: Product, query: CatalogQuery): boolean {
  const normalizedText = query.text.trim().toLowerCase();
  const hasText = !normalizedText || [product.name, product.description, product.category, product.eyebrow].join(" ").toLowerCase().includes(normalizedText);
  return (query.category === "all" || product.category === query.category) && matchesPrice(product.priceCents, query.price) && hasText;
}

export function sortCatalog(items: Product[], query: CatalogQuery): Product[] {
  return [...items].sort((first, second) => {
    if (query.text) {
      const scoreDelta = textScore(second, query.text) - textScore(first, query.text);
      if (scoreDelta !== 0) return scoreDelta;
    }
    if (query.sort === "price-low") return first.priceCents - second.priceCents;
    if (query.sort === "price-high") return second.priceCents - first.priceCents;
    if (query.sort === "rating") return second.rating - first.rating || second.reviewCount - first.reviewCount;
    return Number(second.featured) - Number(first.featured) || second.reviewCount - first.reviewCount;
  });
}

export function queryCatalog(query: Partial<CatalogQuery> | null | undefined, source = products): Product[] {
  const normalized = normalizeCatalogQuery(query);
  return sortCatalog(source.filter((product) => matchesCatalogQuery(product, normalized)), normalized);
}

export function catalogSummary(items: Product[], source = products): CatalogSummary {
  const categoryCounts: Record<ProductCategory, number> = { audio: 0, desk: 0, travel: 0, wellness: 0 };
  for (const product of items) categoryCounts[product.category] += 1;
  const totalPrice = items.reduce((sum, product) => sum + product.priceCents, 0);
  const totalRating = items.reduce((sum, product) => sum + product.rating, 0);
  return { total: source.length, visible: items.length, averagePriceCents: items.length ? Math.round(totalPrice / items.length) : 0, averageRating: items.length ? Number((totalRating / items.length).toFixed(2)) : 0, categoryCounts };
}

export function formatCatalogSummary(summary: CatalogSummary): string {
  if (!summary.visible) return "No objects match this search.";
  const average = formatPrice(summary.averagePriceCents);
  return `${summary.visible} ${summary.visible === 1 ? "object" : "objects"} · average ${average} · ${summary.averageRating.toFixed(1)} average rating`;
}

export function categoryFacetCounts(source = products): Array<{ category: ProductCategory; count: number; label: string }> {
  const labels: Record<ProductCategory, string> = { audio: "Audio", desk: "Desk", travel: "Travel", wellness: "Wellness" };
  const counts: Record<ProductCategory, number> = { audio: 0, desk: 0, travel: 0, wellness: 0 };
  source.forEach((product) => { counts[product.category] += 1; });
  return (Object.keys(labels) as ProductCategory[]).map((category) => ({ category, count: counts[category], label: labels[category] }));
}

export function recommendProducts(seed: Product, source = products): ProductRecommendation[] {
  return source.filter((product) => product.slug !== seed.slug).map((product) => {
    const sameCategory = product.category === seed.category;
    const priceDistance = Math.abs(product.priceCents - seed.priceCents) / Math.max(seed.priceCents, 1);
    const score = (sameCategory ? 5 : 0) + product.rating - Math.min(priceDistance * 2, 3);
    const reason = sameCategory ? `More from ${seed.category}` : product.featured ? "Featured this week" : "Pairs well with your collection";
    return { product, reason, score: Number(score.toFixed(2)) };
  }).sort((first, second) => second.score - first.score).slice(0, 4);
}

export function priceLabel(product: Product): string {
  const current = formatPrice(product.priceCents);
  return product.compareAtCents ? `${current} · save ${formatPrice(product.compareAtCents - product.priceCents)}` : current;
}

export function stockTone(stockLabel: string): "green" | "amber" {
  return /only/i.test(stockLabel) ? "amber" : "green";
}

export function deliveryWindow(product: Product): { days: number; label: string } {
  const days = product.delivery.includes("today") ? 2 : product.delivery.includes("tomorrow") ? 3 : 4;
  return { days, label: `Arrives in ${days} days` };
}

export function collectionByCategory(category: ProductCategory, source = products): Product[] {
  return queryCatalog({ category, sort: "featured" }, source);
}

export function featuredCollection(source = products): Product[] {
  return source.filter((product) => product.featured).sort((first, second) => second.rating - first.rating);
}

export function cheapestProduct(source = products): Product | undefined {
  return [...source].sort((first, second) => first.priceCents - second.priceCents)[0];
}

export function highestRatedProduct(source = products): Product | undefined {
  return [...source].sort((first, second) => second.rating - first.rating || second.reviewCount - first.reviewCount)[0];
}

export function productsForSavedSlugs(slugs: string[], source = products): Product[] {
  const selected = new Set(slugs);
  return source.filter((product) => selected.has(product.slug));
}

export function queryDescription(query: CatalogQuery): string {
  const parts = [query.text ? `matching “${query.text}”` : "all objects", query.category !== "all" ? `in ${query.category}` : "", query.price !== "all" ? `priced ${query.price.replaceAll("-", " ")}` : ""].filter(Boolean);
  return parts.join(" · ");
}
