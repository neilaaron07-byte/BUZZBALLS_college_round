"use client";
/* The standalone fixture keeps its root link as a normal document boundary. */
/* eslint-disable @next/next/no-html-link-for-pages */

import { ArrowRight, Heart, Trash2 } from "lucide-react";
import { productsForSavedSlugs } from "./catalog-engine";
import { ProductCard, ShopNestFooter, ShopNestHeader } from "./components";
import { useShopNest } from "./store";

export function WishlistScreen() {
  const { savedSlugs } = useShopNest();
  const products = productsForSavedSlugs(savedSlugs);
  return <main className="sn-app"><ShopNestHeader eyebrow="Saved objects" /><div className="sn-page sn-wishlist-page"><div className="sn-breadcrumb"><a href="/">ShopNest</a><span>/</span><b>Saved</b></div><header className="sn-page-heading"><div><span className="sn-overline">SAVED OBJECTS / {products.length}</span><h1>For another <em>good day.</em></h1><p>Keep a short list of objects worth returning to. It stays on this device and never becomes a surprise email.</p></div></header>{products.length ? <div className="sn-wishlist-grid">{products.map((product) => <ProductCard product={product} key={product.slug} />)}</div> : <div className="sn-empty-state sn-wishlist-empty"><span><Heart size={18} aria-hidden="true" /></span><h2>Nothing saved yet.</h2><p>When something feels useful, tap the heart on its card. The object will wait here.</p><a className="sn-button sn-button-dark" href="/search">Browse the collection <ArrowRight size={15} aria-hidden="true" /></a></div>}<div className="sn-wishlist-note"><Trash2 size={15} aria-hidden="true" /><p>Saved objects are local-only. Remove them from any product card when the list gets too long.</p></div></div><ShopNestFooter /></main>;
}
