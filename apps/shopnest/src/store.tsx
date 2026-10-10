"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { getProduct, releaseFor } from "./catalog";
import type { CartLine, Product, ReleaseMode, ShopNestSnapshot } from "./types";

type ShopNestContextValue = {
  mode: ReleaseMode;
  setMode: (mode: ReleaseMode) => void;
  cart: CartLine[];
  savedSlugs: string[];
  cartItemCount: number;
  cartTotalCents: number;
  addToCart: (product: Product, quantity?: number, finish?: string) => void;
  removeFromCart: (slug: string) => void;
  updateQuantity: (slug: string, quantity: number) => void;
  toggleSaved: (slug: string) => void;
  clearCart: () => void;
};

const storageKey = "patchwork-shopnest-snapshot";
const ShopNestContext = createContext<ShopNestContextValue | null>(null);

function validMode(value: unknown): value is ReleaseMode {
  return value === "v1" || value === "v2" || value === "v3";
}

function readSnapshot(): Partial<ShopNestSnapshot> {
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};
    return parsed as Partial<ShopNestSnapshot>;
  } catch {
    return {};
  }
}

export function ShopNestProvider({ children, initialMode = "v2" }: Readonly<{ children: React.ReactNode; initialMode?: ReleaseMode }>) {
  const [mode, setMode] = useState<ReleaseMode>(initialMode);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [savedSlugs, setSavedSlugs] = useState<string[]>([]);

  useEffect(() => {
    const snapshot = readSnapshot();
    window.queueMicrotask(() => {
      if (validMode(snapshot.mode)) setMode(snapshot.mode);
      if (Array.isArray(snapshot.savedSlugs)) setSavedSlugs(snapshot.savedSlugs.filter((slug): slug is string => typeof slug === "string"));
      if (Array.isArray(snapshot.cart)) {
        setCart(snapshot.cart.flatMap((line) => {
          if (!line || typeof line !== "object" || typeof line.product?.slug !== "string") return [];
          const product = getProduct(line.product.slug);
          return [{ product, quantity: Math.max(1, Math.min(9, Number(line.quantity) || 1)), finish: typeof line.finish === "string" ? line.finish : product.finish }];
        }));
      }
    });
  }, []);

  useEffect(() => {
    const snapshot: ShopNestSnapshot = { mode, cart, savedSlugs, search: "", filters: { category: "all", price: "all", sort: "featured" } };
    window.localStorage.setItem(storageKey, JSON.stringify(snapshot));
  }, [cart, mode, savedSlugs]);

  const addToCart = useCallback((product: Product, quantity = 1, finish = product.finish) => {
    setCart((current) => {
      const existing = current.find((line) => line.product.slug === product.slug && line.finish === finish);
      if (existing) return current.map((line) => line === existing ? { ...line, quantity: Math.min(9, line.quantity + quantity) } : line);
      return [...current, { product, quantity: Math.min(9, Math.max(1, quantity)), finish }];
    });
  }, []);

  const removeFromCart = useCallback((slug: string) => setCart((current) => current.filter((line) => line.product.slug !== slug)), []);
  const updateQuantity = useCallback((slug: string, quantity: number) => setCart((current) => current.flatMap((line) => line.product.slug === slug ? (quantity > 0 ? [{ ...line, quantity: Math.min(9, quantity) }] : []) : [line])), []);
  const toggleSaved = useCallback((slug: string) => setSavedSlugs((current) => current.includes(slug) ? current.filter((value) => value !== slug) : [...current, slug]), []);
  const clearCart = useCallback(() => setCart([]), []);
  const cartItemCount = cart.reduce((total, line) => total + line.quantity, 0);
  const cartTotalCents = cart.reduce((total, line) => total + line.product.priceCents * line.quantity, 0);
  const value = useMemo(() => ({ mode, setMode, cart, savedSlugs, cartItemCount, cartTotalCents, addToCart, removeFromCart, updateQuantity, toggleSaved, clearCart }), [addToCart, cart, cartItemCount, cartTotalCents, clearCart, mode, removeFromCart, savedSlugs, toggleSaved, updateQuantity]);

  return <ShopNestContext.Provider value={value}>{children}</ShopNestContext.Provider>;
}

export function useShopNest(): ShopNestContextValue {
  const value = useContext(ShopNestContext);
  if (!value) throw new Error("useShopNest must be used inside ShopNestProvider");
  return value;
}

export function useReleaseFixture() {
  const { mode } = useShopNest();
  return releaseFor(mode);
}
