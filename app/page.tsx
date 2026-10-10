"use client";

import { useEffect, useState } from "react";

type TestState = "idle" | "running" | "failed" | "passed";

const patchManifest = `{
  "id": "pw-0042",
  "target": "button[aria-label="Add to cart"]",
  "action": "set_style",
  "property": "z-index",
  "value": "999",
  "ttl_days": 14
}`;

function Icon({ name }: { name: "search" | "bag" | "arrow" | "close" | "check" | "warning" | "spark" }) {
  const glyphs = { search: "⌕", bag: "□", arrow: "↗", close: "×", check: "✓", warning: "!", spark: "✦" };
  return <span className={`icon icon-${name}`} aria-hidden="true">{glyphs[name]}</span>;
}

function Logo() {
  return <a className="logo" href="#top" aria-label="Lumen home"><span className="logo-mark">L</span><span>LUMEN<span className="logo-dot">.</span></span></a>;
}

function StatusBadge({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "danger" | "success" }) {
  return <span className={`status-badge status-${tone}`}><span className="status-dot" />{children}</span>;
}

function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  return <div className="toast" role="status"><span className="toast-mark"><Icon name={message.includes("intercepted") ? "warning" : "check"} /></span><span>{message}</span><button onClick={onClose} aria-label="Dismiss message"><Icon name="close" /></button></div>;
}

function ProductVisual() {
  return <div className="product-visual" aria-label="Aurora headphones product image" role="img">
    <div className="visual-orbit orbit-one" />
    <div className="visual-orbit orbit-two" />
    <div className="headphone">
      <div className="headphone-band" />
      <div className="headphone-cup cup-left"><span /></div>
      <div className="headphone-cup cup-right"><span /></div>
      <div className="headphone-bridge" />
    </div>
    <span className="visual-caption">AURORA / 01</span>
    <span className="visual-index">01 <i /> 03</span>
  </div>;
}

function IncidentBanner({ onTest }: { onTest: () => void }) {
  return <section className="incident-banner" aria-label="Active production incident">
    <div className="incident-signal"><Icon name="warning" /></div>
    <div className="incident-copy"><span className="overline">DEMO ENVIRONMENT / SEEDED INCIDENT</span><strong>Checkout is currently unavailable</strong><span>The Add to cart action is being covered by a stale promo layer after the latest storefront release.</span></div>
    <div className="incident-actions"><StatusBadge tone="danger">PRODUCTION BUG</StatusBadge><button className="text-link" onClick={onTest}>Run failing test <Icon name="arrow" /></button></div>
  </section>;
}

function PatchInspector({ preview, setPreview, testState, runTest }: { preview: boolean; setPreview: (value: boolean) => void; testState: TestState; runTest: () => void }) {
  return <aside className="inspector" aria-label="PATCHWORK visual patcher">
    <div className="inspector-header"><div className="inspector-brand"><span className="inspector-mark"><Icon name="spark" /></span><div><strong>PATCHWORK</strong><span>visual patcher</span></div></div><StatusBadge tone={preview ? "success" : "neutral"}>{preview ? "DRAFT PREVIEW" : "OBSERVING"}</StatusBadge></div>
    <div className="inspector-target"><div className="target-top"><span className="overline">SELECTED TARGET</span><span className="target-confidence">98% match</span></div><strong>Add to cart</strong><code>button[aria-label=&quot;Add to cart&quot;]</code><div className="target-path"><span>product-card</span><i>›</i><span>purchase-panel</span><i>›</i><b>button</b></div></div>
    <div className="inspector-alert"><span><Icon name="warning" /></span><div><strong>Click is intercepted</strong><small>.promo-layer is above the target at z-index 20</small></div></div>
    <div className="manifest-block"><div className="manifest-top"><span className="overline">VALIDATED DSL</span><span className="manifest-lock">signed</span></div><pre>{patchManifest}</pre></div>
    <div className="inspector-footer"><label className="toggle-row" htmlFor="preview-toggle" aria-label="Preview draft patch"><span><strong>Preview draft patch</strong><small>Browser session only · TTL 14 days</small></span><input id="preview-toggle" type="checkbox" checked={preview} onChange={(event) => setPreview(event.target.checked)} /><i className="toggle-ui" /></label><button className="run-button" onClick={runTest} disabled={testState === "running"}><span className={`run-icon run-${testState}`}><Icon name={testState === "passed" ? "check" : testState === "failed" ? "warning" : "arrow"} /></span>{testState === "running" ? "Running Playwright gate…" : testState === "passed" ? "Verification passed" : testState === "failed" ? "Verification failed — retry" : "Run verification gate"}<Icon name="arrow" /></button></div>
  </aside>;
}

function GateRail({ preview, testState }: { preview: boolean; testState: TestState }) {
  const isPassed = preview && testState === "passed";
  return <div className="gate-rail" aria-label="PATCHWORK release gates"><div className="gate-label"><span className="overline">RELEASE GATES</span><span>PT-0042</span></div><div className={`gate ${preview ? "gate-active" : ""}`}><span className="gate-icon">{preview ? "✓" : "1"}</span><div><strong>Schema</strong><small>allowlisted JSON</small></div></div><div className={`gate ${testState === "passed" ? "gate-active" : testState === "failed" ? "gate-failed" : ""}`}><span className="gate-icon">{testState === "passed" ? "✓" : testState === "failed" ? "!" : "2"}</span><div><strong>Verification</strong><small>{testState === "passed" ? "12 checks passed" : testState === "failed" ? "target still blocked" : "waiting for preview"}</small></div></div><div className="gate"><span className="gate-icon">3</span><div><strong>Review</strong><small>human approval</small></div></div><div className="gate"><span className="gate-icon">4</span><div><strong>Lifecycle</strong><small>expires in 14 days</small></div></div><div className={`release-note ${isPassed ? "release-note-ready" : ""}`}><span>{isPassed ? "✓" : "◷"}</span><div><strong>{isPassed ? "Ready for review" : "No production change"}</strong><small>{isPassed ? "Preview is isolated to this session." : "The original site remains untouched."}</small></div></div></div>;
}

export default function Home() {
  const [cartCount, setCartCount] = useState(0);
  const [preview, setPreview] = useState(false);
  const [testState, setTestState] = useState<TestState>("idle");
  const [toast, setToast] = useState("");
  const [mobileInspector, setMobileInspector] = useState(false);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 4000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const showToast = (message: string) => setToast(message);
  const addToCart = () => {
    setCartCount((count) => count + 1);
    showToast("Test passed: Aurora headphones added to cart.");
  };
  const interceptClick = () => showToast("Click intercepted by .promo-layer — checkout is still blocked.");
  const runTest = () => {
    setTestState("running");
    window.setTimeout(() => {
      setTestState(preview ? "passed" : "failed");
      showToast(preview ? "Playwright gate passed: fail-before / pass-after confirmed." : "Playwright gate failed: another element intercepted the click.");
    }, 1000);
  };

  return <main id="top" className="site-shell">
    <div className="top-strip"><span><i /> Demo storefront</span><span>PATCHWORK seed: <b>z-index overlay</b></span><span>Safe preview available <Icon name="arrow" /></span></div>
    <nav className="nav"><Logo /><div className="nav-links"><a href="#shop">New arrivals</a><a href="#shop">Headphones</a><a href="#story">Our approach</a></div><div className="nav-actions"><button className="search-button" aria-label="Search"><Icon name="search" /></button><button className="cart-button" onClick={() => showToast(cartCount ? `${cartCount} item${cartCount > 1 ? "s" : ""} in cart.` : "Your cart is empty — the bug prevented checkout.")}><span>Cart</span><span className="cart-count">{cartCount}</span></button></div></nav>
    <div className="page-wrap">
      <IncidentBanner onTest={runTest} />
      <section className="shop-grid" id="shop">
        <div className="shop-main">
          <div className="breadcrumb"><span>Shop</span><i>/</i><span>Headphones</span><i>/</i><b>Aurora</b></div>
          <div className="product-layout"><ProductVisual /><div className="product-details"><div className="product-kicker"><span>NEW / 2026</span><span className="product-sku">SKU AUR-01</span></div><h1>Aurora<br /><em>headphones</em></h1><p className="product-intro">Quiet the noise. Keep the signal.</p><div className="rating"><span>★★★★★</span><a href="#reviews">4.9 (128 reviews)</a></div><div className="price-row"><strong>$248</strong><del>$289</del><span>14% launch offer</span></div><div className="detail-rule" /><div className="option-block"><div className="option-label"><span>Finish</span><b>Graphite</b></div><div className="swatches"><button className="swatch swatch-graphite selected" aria-label="Graphite finish" /><button className="swatch swatch-sand" aria-label="Sand finish" /><button className="swatch swatch-ice" aria-label="Ice finish" /></div></div><div className="option-block"><div className="option-label"><span>Quantity</span><b>1</b></div><div className="quantity"><button aria-label="Decrease quantity">−</button><span>1</span><button aria-label="Increase quantity">+</button></div></div><div className="purchase-wrap"><button className="add-button" aria-label="Add to cart" onClick={addToCart}>Add to cart <Icon name="arrow" /></button>{!preview && <button className="bug-overlay" aria-label="Show intercepted click details" onClick={interceptClick}><span><Icon name="warning" /> click intercepted</span></button>}</div><div className="purchase-note"><span className={`note-icon ${preview ? "note-good" : ""}`}>{preview ? "✓" : "!"}</span><span>{preview ? "Preview patch active · this session only" : "Add to cart is unavailable in this demo incident"}</span></div><div className="feature-line"><span><b>30h</b> battery</span><span><b>ANC</b> adaptive noise cancel</span><span><b>2yr</b> warranty</span></div></div></div>
        </div>
        <GateRail preview={preview} testState={testState} />
      </section>
      <section className="story-grid" id="story"><div><span className="overline">THE INCIDENT</span><h2>One broken layer.<br /><em>One safe fix.</em></h2></div><div className="story-copy"><p>After the Aurora release, a promotional layer stayed mounted above the purchase action. The button still looked right — but every click went nowhere.</p><p>That is the kind of small, expensive frontend failure PATCHWORK is built to contain: a constrained patch, proven in an isolated browser, ready for human approval.</p><a className="story-link" href="#patchwork">See the patch anatomy <Icon name="arrow" /></a></div><div className="story-stat"><strong>14<span>d</span></strong><span>maximum hotfix lifetime</span><i /></div></section>
      <footer className="footer"><Logo /><span>Demo storefront for the PATCHWORK build challenge.</span><span className="footer-right">AI proposes. Tests prove. Humans approve.</span></footer>
    </div>
    <div className="inspector-mobile-trigger"><button onClick={() => setMobileInspector(!mobileInspector)}>{mobileInspector ? "Close" : "Open"} PATCHWORK inspector <Icon name="arrow" /></button></div>
    <div id="patchwork" className={`inspector-dock ${mobileInspector ? "inspector-dock-open" : ""}`}><PatchInspector preview={preview} setPreview={setPreview} testState={testState} runTest={runTest} /></div>
    {toast && <Toast message={toast} onClose={() => setToast("")} />}
  </main>;
}
