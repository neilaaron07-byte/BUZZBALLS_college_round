export type ReleaseMode = "v1" | "v2" | "v3";

export type ProductCategory = "audio" | "desk" | "travel" | "wellness";

export type Product = {
  slug: string;
  name: string;
  category: ProductCategory;
  eyebrow: string;
  description: string;
  priceCents: number;
  compareAtCents?: number;
  rating: number;
  reviewCount: number;
  colors: string[];
  finish: string;
  delivery: string;
  stockLabel: string;
  art: "headphones" | "speaker" | "lamp" | "bag" | "bottle" | "keyboard";
  featured: boolean;
};

export type CartLine = {
  product: Product;
  quantity: number;
  finish: string;
};

export type CheckoutAddress = {
  name: string;
  email: string;
  line1: string;
  city: string;
  region: string;
  postalCode: string;
};

export type CheckoutState = "address" | "payment" | "review" | "success" | "retry" | "failed";

export type ReleaseSignal = {
  tone: "green" | "amber" | "red";
  label: string;
  detail: string;
};

export type ReleaseFixture = {
  mode: ReleaseMode;
  label: string;
  version: string;
  summary: string;
  signals: ReleaseSignal[];
  scannerFindings: string[];
  activePatch?: string;
};

export type SearchFilters = {
  category: ProductCategory | "all";
  price: "all" | "under-100" | "100-200" | "over-200";
  sort: "featured" | "price-low" | "price-high" | "rating";
};

export type ShopNestSnapshot = {
  mode: ReleaseMode;
  cart: CartLine[];
  savedSlugs: string[];
  search: string;
  filters: SearchFilters;
};
