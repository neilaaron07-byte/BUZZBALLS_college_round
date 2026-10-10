"use client";
/* The release selector is a native control nested inside its descriptive label. */
/* eslint-disable jsx-a11y/label-has-associated-control */
/* The home links intentionally preserve a plain navigation boundary for the standalone storefront fixture. */
/* eslint-disable @next/next/no-html-link-for-pages */

import { ArrowRight, Check, ChevronDown, Heart, Search, ShieldCheck, ShoppingBag, Sparkles, TriangleAlert, X } from "lucide-react";
import { useState } from "react";
import { formatPrice, releases } from "./catalog";
import { ProductArt, Rating } from "./art";
import { useReleaseFixture, useShopNest } from "./store";
import type { Product, ReleaseMode } from "./types";

export function ShopNestHeader({ eyebrow = "Demo storefront" }: Readonly<{ eyebrow?: string }>) {
  const { mode, setMode, cartItemCount } = useShopNest();
  return <>
    <div className="sn-topline"><span><i /> {eyebrow}</span><span>PATCHWORK release fixture <b>{releases[mode].version}</b></span><span>Safe preview available <ShieldCheck size={13} aria-hidden="true" /></span></div>
    <header className="sn-header"><a className="sn-brand" href="/" aria-label="ShopNest home"><span className="sn-brand-mark"><span /></span><span>SHOP<span>NEST</span></span></a><nav className="sn-nav" aria-label="Store navigation"><a href="/search?category=audio">Audio</a><a href="/search?category=desk">Desk</a><a href="/search?category=travel">Travel</a><a href="/search?category=wellness">Wellness</a></nav><div className="sn-header-actions"><label className="sn-release-select"><span className="sr-only">Demo release</span><select value={mode} onChange={(event) => setMode(event.target.value as ReleaseMode)}><option value="v1">v1 / healthy</option><option value="v2">v2 / breaking</option><option value="v3">v3 / ambiguous</option></select><ChevronDown size={13} aria-hidden="true" /></label><a className="sn-icon-button" href="/search" aria-label="Search catalog"><Search size={17} aria-hidden="true" /></a><a className="sn-cart-link" href="/cart"><ShoppingBag size={17} aria-hidden="true" /><span>Cart</span><b>{cartItemCount}</b></a><a className="sn-login-link" href="/login">Sign in</a></div></header>
  </>;
}

export function ReleaseBanner() {
  const fixture = useReleaseFixture();
  const tone = fixture.mode === "v1" ? "green" : fixture.mode === "v2" ? "red" : "amber";
  return <section className={`sn-release-banner sn-tone-${tone}`} aria-label="Current release status"><span className="sn-status-icon">{tone === "green" ? <Check size={16} aria-hidden="true" /> : <TriangleAlert size={16} aria-hidden="true" />}</span><div><span className="sn-overline">PATCHWORK DEMO / {fixture.label.toUpperCase()}</span><strong>{fixture.summary}</strong></div><a href={`/dashboard?view=${tone === "green" ? "overview" : "scan"}`}>{tone === "green" ? "Open release health" : "Review findings"}<ArrowRight size={14} aria-hidden="true" /></a></section>;
}

export function ProductCard({ product }: Readonly<{ product: Product }>) {
  const { savedSlugs, toggleSaved, addToCart } = useShopNest();
  const saved = savedSlugs.includes(product.slug);
  return <article className="sn-product-card"><a className="sn-product-card-link" href={`/product/${product.slug}`}><ProductArt product={product} compact /><div className="sn-product-card-copy"><span className="sn-overline">{product.eyebrow}</span><h3>{product.name}</h3><p>{product.description}</p><div className="sn-product-meta"><Rating rating={product.rating} count={product.reviewCount} /><strong>{formatPrice(product.priceCents)}</strong></div></div></a><div className="sn-product-card-actions"><button type="button" className={`sn-save-button${saved ? " is-saved" : ""}`} onClick={() => toggleSaved(product.slug)} aria-label={`${saved ? "Remove" : "Save"} ${product.name}`} aria-pressed={saved}><Heart size={14} fill={saved ? "currentColor" : "none"} aria-hidden="true" /></button><button type="button" className="sn-quick-add" onClick={() => addToCart(product)}>Add to cart <ArrowRight size={13} aria-hidden="true" /></button></div></article>;
}

export function PatchworkInspector() {
  const fixture = useReleaseFixture();
  const [preview, setPreview] = useState(false);
  const [verification, setVerification] = useState<"idle" | "running" | "passed" | "blocked">("idle");
  const [open, setOpen] = useState(false);
  const isHealthy = fixture.mode === "v1" || preview;
  const targetDetail = fixture.mode === "v3" ? "Two semantic candidates share the purchase label." : fixture.mode === "v2" ? "promo-layer intercepts the target at z-index 20" : "The target is visible and keyboard reachable.";
  const runVerification = () => { setVerification("running"); window.setTimeout(() => setVerification(isHealthy ? "passed" : "blocked"), 700); };
  return <><button type="button" className="sn-inspector-trigger" onClick={() => setOpen((value) => !value)}>{open ? <X size={14} aria-hidden="true" /> : <Sparkles size={14} aria-hidden="true" />} {open ? "Close" : "Open"} PATCHWORK inspector</button><aside className={`sn-inspector${open ? " is-open" : ""}`} aria-label="PATCHWORK visual patcher"><div className="sn-inspector-head"><span className="sn-brand-mark"><span /></span><div><strong>PATCHWORK</strong><small>visual patcher</small></div><span className={`sn-pill sn-pill-${fixture.mode === "v1" ? "green" : fixture.mode === "v2" ? "red" : "amber"}`}>{fixture.mode.toUpperCase()}</span></div><div className="sn-inspector-target"><span className="sn-overline">SELECTED TARGET</span><strong>Add to cart</strong><code>button[aria-label=&quot;Add to cart&quot;]</code><span className="sn-target-confidence">{fixture.mode === "v3" ? "blocked / ambiguous" : fixture.mode === "v2" ? "98% match" : "99% match"}</span></div><div className={`sn-inspector-alert sn-alert-${fixture.mode === "v1" ? "green" : fixture.mode === "v2" ? "red" : "amber"}`}><span>{fixture.mode === "v1" ? <Check size={14} aria-hidden="true" /> : <TriangleAlert size={14} aria-hidden="true" />}</span><div><strong>{fixture.mode === "v1" ? "No finding" : fixture.mode === "v2" ? "Click is intercepted" : "Apply is blocked"}</strong><small>{targetDetail}</small></div></div><div className="sn-manifest"><div><span className="sn-overline">SIGNED OPERATION</span><b>{fixture.activePatch ?? "baseline"}</b></div><pre>{`{\n  "action": "set_style",\n  "property": "z-index",\n  "inverse": "attached"\n}`}</pre></div><div className="sn-inspector-footer"><label className="sn-toggle-row"><span><strong>Preview draft patch</strong><small>Browser session only · no public change</small></span><input type="checkbox" checked={preview} onChange={(event) => setPreview(event.target.checked)} /><i /></label><button type="button" className="sn-verify-button" onClick={runVerification} disabled={verification === "running"}><span>{verification === "passed" ? <Check size={13} aria-hidden="true" /> : verification === "blocked" ? <TriangleAlert size={13} aria-hidden="true" /> : <ShieldCheck size={13} aria-hidden="true" />}</span>{verification === "running" ? "Running release checks…" : verification === "passed" ? "Verification passed" : verification === "blocked" ? "Blocked — review target" : "Run verification gate"}<ArrowRight size={13} aria-hidden="true" /></button>{verification === "passed" ? <p className="sn-inspector-success" role="status">Pass-after confirmed. The public storefront is unchanged.</p> : null}</div></aside></>;
}

export function ShopNestFooter() {
  return <footer className="sn-footer"><div><a className="sn-brand" href="/"><span className="sn-brand-mark"><span /></span><span>SHOP<span>NEST</span></span></a><p>Objects for clearer days. Demo storefront for PATCHWORK.</p></div><div className="sn-footer-links"><a href="/search">Catalog</a><a href="/login">Account</a><a href="/dashboard">PATCHWORK workspace</a></div><span className="sn-footer-seam">SCAN · FIX · SHIP · UNDO</span></footer>;
}
