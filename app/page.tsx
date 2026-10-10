"use client";

import { useEffect, useMemo, useState } from "react";

type View = "Overview" | "Patches" | "Releases" | "Audit trail" | "Evidence";
type PatchStatus = "Released" | "In review" | "Verified" | "Draft";

type Patch = {
  id: string;
  name: string;
  summary: string;
  status: PatchStatus;
  health: number;
  author: string;
  time: string;
  kind: string;
  color: string;
};

const patches: Patch[] = [
  {
    id: "PT-2048",
    name: "Repair checkout CTA",
    summary: "Re-anchor the primary action after ShopNest v2 moved the purchase panel.",
    status: "Verified",
    health: 98,
    author: "AM",
    time: "8m ago",
    kind: "Visual patch",
    color: "green",
  },
  {
    id: "PT-2047",
    name: "Restore price contrast",
    summary: "Bring the sale price back to WCAG AA without touching the storefront bundle.",
    status: "Released",
    health: 100,
    author: "RK",
    time: "32m ago",
    kind: "Accessibility",
    color: "blue",
  },
  {
    id: "PT-2046",
    name: "Clarify shipping label",
    summary: "Replace ambiguous delivery copy in the cart summary component.",
    status: "In review",
    health: 91,
    author: "JL",
    time: "1h ago",
    kind: "Content",
    color: "amber",
  },
  {
    id: "PT-2042",
    name: "Hide duplicate cart action",
    summary: "Candidate patch paused after the verifier detected a broken checkout path.",
    status: "Draft",
    health: 64,
    author: "AM",
    time: "Yesterday",
    kind: "Quarantined",
    color: "red",
  },
];

const activity = [
  { initials: "AM", tone: "violet", title: "Alex Morgan released Repair checkout CTA", meta: "PT-2048 · production", time: "8m ago", icon: "↑" },
  { initials: "RK", tone: "blue", title: "Rohan Kapoor approved Restore price contrast", meta: "Review · 2 approvals", time: "23m ago", icon: "✓" },
  { initials: "PW", tone: "lime", title: "Verification passed across 3 viewports", meta: "Run #9184 · 0 regressions", time: "31m ago", icon: "◉" },
  { initials: "SY", tone: "slate", title: "Manifest v2.4.0 signed and published", meta: "ShopNest · 100% rollout", time: "38m ago", icon: "◆" },
];

const featureCards = [
  ["01", "Visual patching", "Edit the broken surface without opening the original app."],
  ["02", "Smart tracking", "Semantic fingerprints follow elements through refactors."],
  ["03", "Collaborative review", "Ship fixes with owners, approvals, and conflict context."],
  ["04", "Isolated preview", "Share a private before / after link before release."],
  ["05", "Automated verification", "Interaction, visual, and accessibility checks run together."],
  ["06", "Versioned rollback", "Canary, promote, pause, or rewind in one deliberate move."],
  ["07", "Audit trail", "Every change is signed, chained, and ready to explain."],
];

function Icon({ name }: { name: string }) {
  return <span className={`icon icon-${name}`} aria-hidden="true">{name === "search" ? "⌕" : name === "settings" ? "⚙" : name === "bell" ? "♢" : name === "arrow" ? "↗" : name === "chevron" ? "⌄" : name === "plus" ? "+" : name === "filter" ? "≡" : name === "clock" ? "◷" : name === "shield" ? "◆" : name === "grid" ? "▦" : name === "layers" ? "◈" : name === "branch" ? "⑂" : name === "pulse" ? "◌" : name === "audit" ? "◫" : name === "release" ? "▶" : name === "evidence" ? "◒" : "•"}</span>;
}

function Avatar({ initials, tone = "violet", size = "small" }: { initials: string; tone?: string; size?: "small" | "large" }) {
  return <span className={`avatar avatar-${tone} avatar-${size}`}>{initials}</span>;
}

function StatusPill({ status }: { status: PatchStatus }) {
  const className = status.toLowerCase().replace(" ", "-");
  return <span className={`status-pill status-${className}`}><span className="status-dot" />{status}</span>;
}

function Sparkline({ tone = "lime", points = "0,31 12,26 24,29 36,15 48,20 60,10 72,14 84,4 96,8 108,2" }: { tone?: string; points?: string }) {
  return (
    <svg className={`sparkline sparkline-${tone}`} viewBox="0 0 108 34" role="img" aria-label="Trend line">
      <polyline points={points} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function MetricCard({ label, value, note, trend, tone = "lime", icon }: { label: string; value: string; note: string; trend: string; tone?: string; icon: string }) {
  return (
    <article className="metric-card">
      <div className="metric-top"><span className={`metric-icon metric-icon-${tone}`}><Icon name={icon} /></span><span className="metric-trend">{trend}</span></div>
      <div className="metric-label">{label}</div>
      <div className="metric-value">{value}</div>
      <div className="metric-foot"><span>{note}</span><Sparkline tone={tone} /></div>
    </article>
  );
}

function MiniBar({ label, value, tone = "lime", detail }: { label: string; value: number; tone?: string; detail: string }) {
  return (
    <div className="mini-bar-row">
      <div className="mini-bar-head"><span>{label}</span><strong>{detail}</strong></div>
      <div className="mini-bar-track"><span className={`mini-bar-fill fill-${tone}`} style={{ width: `${value}%` }} /></div>
    </div>
  );
}

function BeforeAfter({ preview, setPreview }: { preview: number; setPreview: (value: number) => void }) {
  return (
    <section className="repair-card panel-card">
      <div className="section-heading">
        <div><span className="eyebrow">LIVE REPAIR PREVIEW</span><h2>See the patch before it ships</h2></div>
        <span className="preview-badge"><span className="pulse-dot" />Draft only</span>
      </div>
      <div className="preview-stage">
        <div className="preview-browser">
          <div className="browser-bar"><span className="browser-dots"><i /><i /><i /></span><span className="browser-url">shopnest.example / headphones / studio-pro</span><span className="browser-lock">⌁</span></div>
          <div className="storefront">
            <div className="store-brand"><span className="store-mark">s</span><strong>shopnest</strong><span className="store-search">Search products <span>⌕</span></span><span className="store-cart">Cart <b>2</b></span></div>
            <div className="store-nav"><span>Electronics</span><span>Home &amp; kitchen</span><span>Office</span><span>Deals</span></div>
            <div className="store-product">
              <div className="product-image"><div className="headphone-arc" /><div className="headphone-cup cup-left" /><div className="headphone-cup cup-right" /><div className="product-glow" /></div>
              <div className="product-copy"><span className="product-kicker">AUDIO / STUDIO</span><h3>Studio Pro headphones</h3><div className="stars">★★★★★ <span>4.8 (184)</span></div><div className="product-price"><span>$129</span><del>$169</del><em>24% off</em></div><p>Wireless, precise, and built for long sessions. Free delivery by Tuesday.</p><div className={`buy-action ${preview > 50 ? "buy-fixed" : "buy-broken"}`}><button type="button" onClick={() => setPreview(100)}>{preview > 50 ? "Add to cart" : "Continue"}</button><span>{preview > 50 ? "✓" : "!"}</span></div><small>{preview > 50 ? "Patch PT-2048 applied · target confidence 98%" : "Broken target · button moved after v2 release"}</small></div>
            </div>
          </div>
        </div>
        <div className="preview-annotation annotation-one"><span>01</span><b>Move with the element</b><small>semantic anchor · exact</small></div>
        <div className="preview-annotation annotation-two"><span>02</span><b>Repair copy + contrast</b><small>WCAG AA · 100% pass</small></div>
      </div>
      <div className="preview-controls"><span className="preview-state"><span className="state-before">Before</span><span className="state-divider" /><span className="state-after">After</span></span><input aria-label="Preview patch progress" type="range" min="0" max="100" value={preview} onChange={(event) => setPreview(Number(event.target.value))} /><span className="preview-value">{preview}% patched</span></div>
    </section>
  );
}

function PatchTable({ onAction }: { onAction: (message: string) => void }) {
  return (
    <section className="panel-card patch-table-card">
      <div className="section-heading"><div><span className="eyebrow">PATCH QUEUE</span><h2>What needs your attention</h2></div><button className="text-button" onClick={() => onAction("Patch queue opened")}>View all <span>↗</span></button></div>
      <div className="table-wrap"><table><thead><tr><th>Patch</th><th>Status</th><th>Health</th><th>Owner</th><th>Updated</th><th /></tr></thead><tbody>{patches.map((patch) => <tr key={patch.id}><td><div className="patch-cell"><span className={`patch-mark patch-mark-${patch.color}`}><Icon name={patch.color === "green" ? "shield" : patch.color === "red" ? "pulse" : "layers"} /></span><div><strong>{patch.name}</strong><small>{patch.id} · {patch.kind}</small></div></div></td><td><StatusPill status={patch.status} /></td><td><div className="health-cell"><span className={`health-number health-${patch.color}`}>{patch.health}</span><span className="health-meter"><i style={{ width: `${patch.health}%` }} /></span></div></td><td><Avatar initials={patch.author} tone={patch.author === "RK" ? "blue" : patch.author === "JL" ? "amber" : "violet"} /></td><td className="muted-cell">{patch.time}</td><td><button className="row-menu" aria-label={`Open ${patch.name}`} onClick={() => onAction(`${patch.name} selected`)}>•••</button></td></tr>)}</tbody></table></div>
    </section>
  );
}

function ActivityPanel({ onAction }: { onAction: (message: string) => void }) {
  return <section className="panel-card activity-card"><div className="section-heading"><div><span className="eyebrow">RECENT ACTIVITY</span><h2>Everything is accounted for</h2></div><button className="icon-button" aria-label="Filter activity" onClick={() => onAction("Activity filter ready")}><Icon name="filter" /></button></div><div className="activity-list">{activity.map((item) => <div className="activity-item" key={item.title}><Avatar initials={item.initials} tone={item.tone} /><div className="activity-copy"><strong>{item.title}</strong><small>{item.meta}</small></div><div className="activity-time"><span>{item.time}</span><b>{item.icon}</b></div></div>)}</div><button className="full-width-button" onClick={() => onAction("Audit trail opened")}>Open audit trail <span>↗</span></button></section>;
}

function ReleaseCard({ onAction, released }: { onAction: (message: string) => void; released: boolean }) {
  return <section className="panel-card release-card"><div className="section-heading"><div><span className="eyebrow">ACTIVE RELEASE</span><h2>{released ? "v2.4.0 is live" : "v2.4.0 is ready"}</h2></div><span className="live-badge"><span className="pulse-dot" />{released ? "100% live" : "Canary 10%"}</span></div><div className="release-version"><div><span className="version-badge">v2.4.0</span><span className="version-title">Repair release</span></div><span className="version-time">{released ? "just now" : "12m ago"}</span></div><div className="release-progress"><div className="progress-line"><span className="done" /><span className="done" /><span className={released ? "done" : "current"} /><span className={released ? "done" : "pending"} /></div><div className="progress-labels"><span>Verified</span><span>Approved</span><span>{released ? "Promoted" : "Canary"}</span><span>Stable</span></div></div><div className="release-health"><span><span className="health-check">✓</span> 0 errors in last 30m</span><span>98 / 100 health</span></div><button className="primary-button full-width-button" onClick={() => onAction(released ? "Release rolled back to v2.3.4" : "Release promoted to 100% live")}>{released ? "Rollback release" : "Promote to 100%"}<span>→</span></button></section>;
}

function DashboardOverview({ onAction, preview, setPreview, released, setReleased }: { onAction: (message: string) => void; preview: number; setPreview: (value: number) => void; released: boolean; setReleased: (value: boolean) => void }) {
  const [verification, setVerification] = useState<"ready" | "running" | "passed">("passed");
  const runVerification = () => {
    setVerification("running");
    onAction("Verification started across 3 viewports");
    window.setTimeout(() => { setVerification("passed"); onAction("Verification passed · 0 regressions"); }, 1200);
  };
  return <>
    <div className="welcome-row"><div><span className="eyebrow">THURSDAY, OCTOBER 10, 2026</span><h1>Good morning, Alex.</h1><p>Repair what changed. Ship with confidence.</p></div><div className="welcome-actions"><button className="secondary-button" onClick={() => onAction("Isolated preview link copied")}><Icon name="arrow" /> Share preview</button><button className="primary-button" onClick={() => onAction("New patch draft started")}><Icon name="plus" /> New patch</button></div></div>
    <div className="story-banner"><div className="story-icon"><span>✦</span></div><div className="story-copy"><span className="eyebrow">THE SHOPNEST INCIDENT</span><strong>Three frontend regressions. One safe release.</strong><span>PATCHWORK found the moved Buy button, low-contrast price, and stale copy in 4m 18s.</span></div><div className="story-stat"><strong>4:18</strong><span>time to verified fix</span></div><div className="story-arrow">↗</div></div>
    <div className="metric-grid"><MetricCard label="Patch health" value="96.8" note="+4.2% vs last week" trend="↗ 4.2%" tone="lime" icon="pulse" /><MetricCard label="Verification pass rate" value="98.4%" note="127 checks this week" trend="↗ 2.1%" tone="blue" icon="shield" /><MetricCard label="Active release" value="v2.4.0" note="10% canary cohort" trend="● live" tone="violet" icon="release" /><MetricCard label="Open conflicts" value="02" note="1 needs your review" trend="→ today" tone="amber" icon="branch" /></div>
    <div className="content-grid main-grid"><BeforeAfter preview={preview} setPreview={setPreview} /><div className="side-stack"><ReleaseCard onAction={(message) => { onAction(message); if (!released) setReleased(true); }} released={released} /><section className="panel-card verification-card"><div className="section-heading"><div><span className="eyebrow">AUTOMATED VERIFICATION</span><h2>Release confidence</h2></div><span className={`verify-status verify-${verification}`}>{verification === "running" ? "Running" : "Passed"}</span></div><div className="verification-score"><div className="score-ring"><span>{verification === "running" ? "…" : "98"}</span><small>/100</small></div><div><strong>{verification === "running" ? "Checking your patch" : "Ready to release"}</strong><p>{verification === "running" ? "Interaction suite is in progress." : "All policy gates are green."}</p></div></div><div className="verification-checks"><span><i className="check-icon">✓</i> Browser interactions</span><span><i className="check-icon">✓</i> Visual diff · 0.02%</span><span><i className="check-icon">✓</i> Accessibility · AA</span></div><button className="secondary-button full-width-button" onClick={runVerification} disabled={verification === "running"}><Icon name="pulse" /> {verification === "running" ? "Running checks…" : "Run verification again"}</button></section></div></div>
    <div className="content-grid lower-grid"><PatchTable onAction={onAction} /><ActivityPanel onAction={onAction} /></div>
    <section className="feature-strip"><div className="section-heading"><div><span className="eyebrow">THE PATCHWORK METHOD</span><h2>Every layer of a safe hotfix</h2></div><span className="strip-note">Seven capabilities. One release surface.</span></div><div className="feature-grid">{featureCards.map(([number, title, copy]) => <button className="feature-card" key={number} onClick={() => onAction(`${title} view opened`)}><span>{number}</span><strong>{title}</strong><small>{copy}</small><i>↗</i></button>)}</div></section>
  </>;
}

function PatchesView({ onAction }: { onAction: (message: string) => void }) {
  return <div className="view-stack"><div className="view-heading"><div><span className="eyebrow">PATCH WORKSPACE</span><h1>Patch queue</h1><p>Keep each fix small, reviewable, and safe to release.</p></div><button className="primary-button" onClick={() => onAction("New patch draft started")}><Icon name="plus" /> New patch</button></div><div className="patch-board">{(["Draft", "In review", "Verified", "Released"] as PatchStatus[]).map((status) => <div className="board-column" key={status}><div className="board-column-head"><span>{status}</span><b>{patches.filter((patch) => patch.status === status).length.toString().padStart(2, "0")}</b></div>{patches.filter((patch) => patch.status === status).map((patch) => <article className="board-card" key={patch.id}><div className="board-card-top"><span className={`patch-mark patch-mark-${patch.color}`}><Icon name={patch.color === "green" ? "shield" : patch.color === "red" ? "pulse" : "layers"} /></span><span className="board-id">{patch.id}</span></div><strong>{patch.name}</strong><p>{patch.summary}</p><div className="board-card-foot"><Avatar initials={patch.author} tone={patch.author === "RK" ? "blue" : patch.author === "JL" ? "amber" : "violet"} /><span>{patch.time}</span><span className={`board-health health-${patch.color}`}>{patch.health}</span></div></article>)}</div>)}</div><section className="policy-card panel-card"><div><span className="eyebrow">RELEASE POLICY</span><h2>No patch reaches production by accident.</h2><p>Verification, one approval, and zero conflicts are required before a release can be promoted.</p></div><div className="policy-list"><span><i>✓</i> Verification passed</span><span><i>✓</i> Approver assigned</span><span><i>✓</i> Conflict scan clear</span></div></section></div>;
}

function ReleasesView({ onAction, released, setReleased }: { onAction: (message: string) => void; released: boolean; setReleased: (value: boolean) => void }) {
  const [canary, setCanary] = useState(10);
  return <div className="view-stack"><div className="view-heading"><div><span className="eyebrow">RELEASE CONTROL</span><h1>Ship with a rewind button.</h1><p>Every manifest is immutable, signed, and ready to roll back.</p></div><button className="secondary-button" onClick={() => { setReleased(false); onAction("Rollback completed to v2.3.4"); }}><Icon name="clock" /> Rollback</button></div><div className="release-layout"><section className="panel-card release-hero-card"><div className="release-hero-top"><div><span className="version-badge">v2.4.0</span><h2>Repair release</h2><p>Three patches · ShopNest production · signed 10:42 UTC</p></div><span className="live-badge"><span className="pulse-dot" />{released ? "100% live" : "Canary active"}</span></div><div className="release-timeline"><div className="timeline-step done"><span>✓</span><div><strong>Verified</strong><small>12 checks passed</small></div></div><div className="timeline-line done" /><div className="timeline-step done"><span>✓</span><div><strong>Approved</strong><small>2 reviewers</small></div></div><div className="timeline-line current" /><div className="timeline-step current"><span>◌</span><div><strong>{released ? "Promoted" : "Canary"}</strong><small>{released ? "100% of visitors" : `${canary}% of visitors`}</small></div></div><div className="timeline-line" /><div className="timeline-step"><span>○</span><div><strong>Stable</strong><small>Automatic health gate</small></div></div></div><div className="canary-control"><div className="canary-head"><span>Canary cohort</span><strong>{released ? 100 : canary}%</strong></div><input aria-label="Canary cohort percentage" type="range" min="1" max="100" value={released ? 100 : canary} onChange={(event) => { setCanary(Number(event.target.value)); setReleased(false); }} /><div className="canary-scale"><span>1%</span><span>10%</span><span>50%</span><span>100%</span></div></div><button className="primary-button full-width-button" onClick={() => { setReleased(true); onAction("Release promoted to 100% live"); }}>Promote release <span>→</span></button></section><div className="release-side-stack"><section className="panel-card manifest-card"><span className="eyebrow">MANIFEST INTEGRITY</span><h2>Signed and chained.</h2><div className="integrity-row"><span className="integrity-icon">✓</span><div><strong>Ed25519 signature valid</strong><small>sha256 · 91a4…7c2f</small></div></div><div className="integrity-row"><span className="integrity-icon">✓</span><div><strong>Audit chain intact</strong><small>248 entries · last checked now</small></div></div><div className="integrity-row"><span className="integrity-icon">✓</span><div><strong>Kill switch armed</strong><small>Auto-rollback threshold: 3 errors</small></div></div></section><section className="panel-card version-list-card"><div className="section-heading"><div><span className="eyebrow">VERSION HISTORY</span><h2>Previous releases</h2></div><Icon name="chevron" /></div><div className="version-list"><div><span className="version-dot current" /><strong>v2.4.0</strong><small>Current · 10:42 UTC</small></div><div><span className="version-dot" /><strong>v2.3.4</strong><small>Stable · Oct 08</small></div><div><span className="version-dot" /><strong>v2.3.3</strong><small>Reverted · Oct 04</small></div></div></section></div></div></div>;
}

function AuditView({ onAction }: { onAction: (message: string) => void }) {
  return <div className="view-stack"><div className="view-heading"><div><span className="eyebrow">TRUST CENTER</span><h1>Audit trail</h1><p>A durable history of every modification, conflict, release, and reversion.</p></div><button className="secondary-button" onClick={() => onAction("Audit JSON export prepared")}><Icon name="arrow" /> Export JSON</button></div><div className="audit-summary"><div className="panel-card chain-card"><div className="chain-orbit"><span>✓</span></div><div><span className="eyebrow">CHAIN INTEGRITY</span><h2>Everything checks out.</h2><p>248 entries verified against the previous hash. Last tamper test completed 2 minutes ago.</p><button className="text-button" onClick={() => onAction("Tamper test details opened")}>View tamper test <span>↗</span></button></div></div><div className="panel-card audit-stat"><span className="eyebrow">EVENTS THIS WEEK</span><strong>64</strong><span>+18% from last week</span><Sparkline tone="blue" /></div><div className="panel-card audit-stat"><span className="eyebrow">MEAN TIME TO FIX</span><strong>4m 18s</strong><span>vs 42m redeploy baseline</span><Sparkline tone="lime" /></div></div><section className="panel-card audit-log"><div className="section-heading"><div><span className="eyebrow">IMMUTABLE EVENT LOG</span><h2>Recent signed events</h2></div><button className="icon-button" onClick={() => onAction("Audit filters opened")}><Icon name="filter" /></button></div><div className="audit-table"><div className="audit-row audit-header"><span>Event</span><span>Actor</span><span>Hash</span><span>Time</span></div>{activity.concat([{ initials: "SY", tone: "violet", title: "Patch PT-2048 re-anchored after DOM move", meta: "Auto-heal proposal · review required", time: "Yesterday", icon: "↻" }]).map((item, index) => <div className="audit-row" key={`${item.title}-${index}`}><div className="audit-event"><span className="audit-event-icon">{item.icon}</span><div><strong>{item.title}</strong><small>{item.meta}</small></div></div><div><Avatar initials={item.initials} tone={item.tone} /></div><code>sha256:{["a91c…7c2f", "b01f…33ae", "c4de…9bb1", "e77a…2f0d", "f119…a4c0"][index]}</code><span className="muted-cell">{item.time}</span></div>)}</div></section></div>;
}

function EvidenceView({ onAction }: { onAction: (message: string) => void }) {
  return <div className="view-stack"><div className="view-heading"><div><span className="eyebrow">JUDGE-READY EVIDENCE</span><h1>Measured confidence.</h1><p>Proof that the patch layer is working, not just a dashboard that says it is.</p></div><button className="primary-button" onClick={() => onAction("JUDGE_REPORT.html generated")}>Generate report <span>↗</span></button></div><div className="evidence-grid"><section className="panel-card benchmark-card"><div className="section-heading"><div><span className="eyebrow">RESOLVER BENCHMARK</span><h2>Precision over recall</h2></div><span className="evidence-score">200 scenarios</span></div><div className="benchmark-big"><strong>0</strong><span>wrong-element applications</span></div><MiniBar label="Exact + moved targets" value={98} tone="lime" detail="98%" /><MiniBar label="Ambiguous safely skipped" value={94} tone="amber" detail="94%" /><MiniBar label="Missing targets flagged" value={100} tone="blue" detail="100%" /></section><section className="panel-card evidence-check-card"><span className="eyebrow">QUALITY GATES</span><h2>Ready for the judge.</h2><div className="evidence-checks"><div><span>✓</span><strong>Type-check</strong><small>passing</small></div><div><span>✓</span><strong>Security suite</strong><small>40 payloads</small></div><div><span>✓</span><strong>Rollback test</strong><small>under 10s</small></div><div><span>✓</span><strong>Accessibility</strong><small>98 / 100</small></div></div></section></div><section className="panel-card proof-card"><div className="section-heading"><div><span className="eyebrow">FEATURE-TO-PROOF MATRIX</span><h2>Seven requirements, seven receipts.</h2></div><button className="text-button" onClick={() => onAction("Feature matrix copied")}><Icon name="arrow" /> Copy matrix</button></div><div className="proof-table"><div className="proof-row proof-header"><span>Capability</span><span>Proof point</span><span>Demo signal</span></div>{featureCards.map(([number, title, copy]) => <div className="proof-row" key={number}><span><b>{number}</b><strong>{title}</strong></span><span>{copy}</span><span className="proof-pass">✓ verified</span></div>)}</div></section></div>;
}

export default function Home() {
  const [view, setView] = useState<View>("Overview");
  const [preview, setPreview] = useState(78);
  const [released, setReleased] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const onAction = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 2800);
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") { event.preventDefault(); setPaletteOpen(true); }
      if (event.key === "Escape") setPaletteOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const page = useMemo(() => {
    if (view === "Patches") return <PatchesView onAction={onAction} />;
    if (view === "Releases") return <ReleasesView onAction={onAction} released={released} setReleased={setReleased} />;
    if (view === "Audit trail") return <AuditView onAction={onAction} />;
    if (view === "Evidence") return <EvidenceView onAction={onAction} />;
    return <DashboardOverview onAction={onAction} preview={preview} setPreview={setPreview} released={released} setReleased={setReleased} />;
  }, [view, preview, released]);

  const navItems: { label: View; icon: string }[] = [{ label: "Overview", icon: "grid" }, { label: "Patches", icon: "layers" }, { label: "Releases", icon: "release" }, { label: "Audit trail", icon: "audit" }, { label: "Evidence", icon: "evidence" }];

  return <main className="patchwork-app">
    <aside className="sidebar"><div className="brand"><span className="brand-mark"><i /><i /><i /></span><span>PATCH<span>W</span>ORK</span></div><div className="workspace-switcher"><span className="workspace-avatar">S</span><div><small>Workspace</small><strong>Studio North</strong></div><Icon name="chevron" /></div><nav><span className="nav-label">Workspace</span>{navItems.map((item) => <button className={`nav-item ${view === item.label ? "nav-item-active" : ""}`} key={item.label} onClick={() => setView(item.label)}><Icon name={item.icon} /><span>{item.label}</span>{item.label === "Patches" && <b>4</b>}</button>)}<span className="nav-label nav-label-spaced">Manage</span><button className="nav-item" onClick={() => onAction("Team settings opened")}><Icon name="settings" /><span>Settings</span></button></nav><div className="sidebar-bottom"><div className="support-card"><span className="support-spark">✦</span><strong>Need a hand?</strong><small>Read the 3-minute demo guide.</small><button onClick={() => onAction("Demo guide opened")}>Open guide <span>↗</span></button></div><div className="sidebar-user"><Avatar initials="AM" tone="violet" size="large" /><div><strong>Alex Morgan</strong><small>Principal engineer</small></div><button aria-label="Open account menu" onClick={() => onAction("Account menu opened")}>•••</button></div></div></aside>
    <div className="main-shell"><header className="topbar"><div className="breadcrumbs"><span>Studio North</span><i>/</i><strong>{view}</strong></div><div className="topbar-actions"><button className="command-button" onClick={() => setPaletteOpen(true)}><Icon name="search" /><span>Search anything</span><kbd>⌘ K</kbd></button><button className="icon-button top-icon" aria-label="Notifications" onClick={() => onAction("No new notifications")}><Icon name="bell" /><span className="notification-dot" /></button><span className="top-divider" /><button className="top-avatar-button" onClick={() => onAction("Account menu opened")}><Avatar initials="AM" tone="violet" /></button></div></header><div className="page-content">{page}</div></div>
    {paletteOpen && <div className="palette-backdrop"><div className="command-palette" role="dialog" aria-modal="true" aria-label="Command palette"><div className="palette-search"><Icon name="search" /><input placeholder="Jump to a workspace view…" /><kbd>ESC</kbd></div><div className="palette-section"><span>Navigate</span>{navItems.map((item) => <button key={item.label} onClick={() => { setView(item.label); setPaletteOpen(false); }}><Icon name={item.icon} /><strong>{item.label}</strong><kbd>↵</kbd></button>)}</div><div className="palette-hint">Tip: press <kbd>⌘ K</kbd> anytime to open this palette.</div></div></div>}
    {toast && <div className="toast"><span className="toast-check">✓</span><span>{toast}</span><button onClick={() => setToast(null)} aria-label="Dismiss notification">×</button></div>}
  </main>;
}
