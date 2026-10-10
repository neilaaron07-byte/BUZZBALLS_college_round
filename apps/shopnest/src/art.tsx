import { Headphones, Keyboard, LampDesk, PackageOpen, Speaker, SprayCan, type LucideIcon } from "lucide-react";
import type { Product } from "./types";

const artIcons: Record<Product["art"], LucideIcon> = { headphones: Headphones, speaker: Speaker, lamp: LampDesk, bag: PackageOpen, bottle: SprayCan, keyboard: Keyboard };

export function ProductArt({ product, compact = false }: Readonly<{ product: Product; compact?: boolean }>) {
  const Icon = artIcons[product.art];
  return <div className={`sn-product-art sn-art-${product.art}${compact ? " sn-product-art-compact" : ""}`} aria-label={`${product.name} illustration`} role="img"><div className="sn-art-halo" /><Icon size={compact ? 70 : 132} strokeWidth={1.05} aria-hidden="true" /><span className="sn-art-code">{product.eyebrow} · {product.slug.slice(0, 3).toUpperCase()}</span></div>;
}

export function Rating({ rating, count }: Readonly<{ rating: number; count: number }>) {
  return <span className="sn-rating" aria-label={`${rating} out of 5 stars from ${count} reviews`}><span aria-hidden="true">★★★★★</span> <b>{rating.toFixed(1)}</b> <u>({count})</u></span>;
}
