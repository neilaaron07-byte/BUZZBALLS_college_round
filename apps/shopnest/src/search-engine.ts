import { products } from "./catalog";
import type { Product, ProductCategory } from "./types";

export type SearchSuggestion = {
  label: string;
  value: string;
  category: ProductCategory | "all";
  reason: string;
};

export type SearchEvent = {
  query: string;
  resultCount: number;
  category: ProductCategory | "all";
  selectedSlug?: string;
};

export const popularQueries = ["quiet audio", "desk light", "travel carry", "objects under $100"] as const;

export function tokenizeSearch(value: string): string[] {
  return value.toLowerCase().trim().split(/\s+/).filter((token) => token.length > 1);
}

export function productSearchTokens(product: Product): string[] {
  return [product.name, product.category, product.eyebrow, product.description].flatMap(tokenizeSearch);
}

export function searchRelevance(product: Product, query: string): number {
  const tokens = tokenizeSearch(query);
  if (!tokens.length) return product.featured ? 2 : 1;
  const searchable = productSearchTokens(product);
  return tokens.reduce((score, token) => score + (searchable.includes(token) ? 4 : searchable.some((value) => value.startsWith(token)) ? 2 : 0), 0) + (product.featured ? 1 : 0);
}

export function rankSearchResults(source: Product[], query: string): Product[] {
  return [...source].sort((first, second) => searchRelevance(second, query) - searchRelevance(first, query) || second.rating - first.rating);
}

export function suggestionsFor(query: string, source = products): SearchSuggestion[] {
  const tokens = tokenizeSearch(query);
  const suggestions: SearchSuggestion[] = [];
  for (const product of rankSearchResults(source, query).slice(0, 4)) {
    const category = product.category;
    const reason = tokens.some((token) => product.name.toLowerCase().includes(token)) ? "Product" : "Collection";
    suggestions.push({ label: product.name, value: product.slug, category, reason });
  }
  for (const category of ["audio", "desk", "travel", "wellness"] as const) {
    if (tokens.some((token) => category.includes(token))) suggestions.push({ label: `${category[0]!.toUpperCase()}${category.slice(1)} collection`, value: category, category, reason: "Category" });
  }
  return suggestions.slice(0, 5);
}

export function queryNeedsEmptyState(query: string, resultCount: number): boolean {
  return tokenizeSearch(query).length > 0 && resultCount === 0;
}

export function emptyStateAdvice(query: string): string {
  const tokens = tokenizeSearch(query);
  if (!tokens.length) return "Start with a product name or collection.";
  if (tokens.length > 2) return "Try fewer words or a collection name like audio or desk.";
  return "Try a broader collection or remove the price filter.";
}

export function recentSearches(events: SearchEvent[]): string[] {
  return [...new Set(events.map((event) => event.query.trim()).filter(Boolean))].slice(-5).reverse();
}

export function searchEvent(query: string, resultCount: number, category: ProductCategory | "all", selectedSlug?: string): SearchEvent {
  return { query: query.trim(), resultCount, category, ...(selectedSlug ? { selectedSlug } : {}) };
}

export function searchFunnel(events: SearchEvent[]): { searches: number; empty: number; selected: number; conversionRate: number } {
  const searches = events.length;
  const empty = events.filter((event) => event.resultCount === 0).length;
  const selected = events.filter((event) => event.selectedSlug).length;
  return { searches, empty, selected, conversionRate: searches ? Math.round((selected / searches) * 100) : 0 };
}
