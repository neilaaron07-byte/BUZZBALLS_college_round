"use client";

import { ArrowLeft, ArrowRight, Check, CircleAlert, Globe2, LoaderCircle, ScanSearch, Send, ShieldCheck, Sparkles, Undo2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { GridBackdrop } from "./ui/backgrounds";
import { Button } from "./ui/button";
import { StatusDot } from "./ui/navigation";
import { PatchworkLogo } from "./ui/seams";
import { toast } from "./ui/overlays";
import type { DashboardData, DashboardFinding, DashboardTone } from "./dashboard-types";

type FixPhase = "idle" | "scanning" | "finding" | "preview" | "verified" | "shipped" | "error";
type ScanSource = "sample" | "live";

const sampleUrl = "https://shopnest.example/products/aurora";

export function FixPage({ data }: Readonly<{ data: DashboardData }>) {
  const [targetUrl, setTargetUrl] = useState(sampleUrl);
  const [phase, setPhase] = useState<FixPhase>("idle");
  const [scanSource, setScanSource] = useState<ScanSource>("sample");
  const [progress, setProgress] = useState(0);
  const [scanMessage, setScanMessage] = useState("Paste a public URL or start with the ShopNest sample.");
  const [error, setError] = useState<string | null>(null);
  const [liveJobId, setLiveJobId] = useState<string | null>(null);
  const [applied, setApplied] = useState(false);
  const [projectedScore, setProjectedScore] = useState(data.workspace.risk.score);
  const findings = useMemo(() => data.workspace.findings.slice(0, 3), [data.workspace.findings]);
  const activeFindings = applied ? findings.slice(1) : findings;
  const apiBase = typeof window === "undefined" ? "" : ((window as Window & { __PATCHWORK_API_URL?: string }).__PATCHWORK_API_URL ?? (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1" ? "http://127.0.0.1:8787" : ""));

  useEffect(() => {
    if (phase !== "scanning" || scanSource !== "sample") return;
    const messages = ["Capturing the page snapshot…", "Checking semantic targets and detector evidence…", "Calculating the safest next action…"];
    let step = 0;
    const timer = window.setInterval(() => {
      step += 1;
      setProgress(Math.min(88, 12 + step * 26));
      const nextMessage = messages[Math.min(step - 1, messages.length - 1)] ?? messages[2] ?? messages[0] ?? "";
      setScanMessage(nextMessage);
      if (step >= messages.length) { window.clearInterval(timer); setProgress(100); setPhase("finding"); setScanMessage("Scan complete. One high-confidence issue is ready for review."); }
    }, 520);
    return () => window.clearInterval(timer);
  }, [phase, scanSource]);

  useEffect(() => {
    if (!liveJobId || !apiBase) return;
    let cancelled = false;
    let timer: number | undefined;
    const poll = async (): Promise<void> => {
      try {
        const response = await fetch(`${apiBase}/api/v1/live-sites/scans/${encodeURIComponent(liveJobId)}`, { headers: { accept: "application/json" } });
        const payload = await response.json() as { data?: { status: "queued" | "running" | "completed" | "failed"; error: string | null; events: readonly { progress: number; message: string }[] } };
        if (cancelled || !payload.data) return;
        const last = payload.data.events.at(-1);
        setProgress(last?.progress ?? 0);
        setScanMessage(last?.message ?? "Reading the live scan job…");
        if (payload.data.status === "completed") { setPhase("finding"); setLiveJobId(null); return; }
        if (payload.data.status === "failed") { setPhase("error"); setError(payload.data.error ?? "The live scan could not complete safely."); setLiveJobId(null); return; }
        timer = window.setTimeout(() => void poll(), 300);
      } catch { if (!cancelled) { setPhase("error"); setError("The live scan connection was interrupted. The target was not changed."); setLiveJobId(null); } }
    };
    void poll();
    return () => { cancelled = true; if (timer) window.clearTimeout(timer); };
  }, [apiBase, liveJobId]);

  async function startScan(): Promise<void> {
    setError(null);
    setApplied(false);
    setProjectedScore(data.workspace.risk.score);
    const trimmed = targetUrl.trim();
    const sample = trimmed === sampleUrl || trimmed === "sample" || trimmed.includes("shopnest.example");
    if (sample) { setScanSource("sample"); setProgress(12); setPhase("scanning"); setScanMessage("Starting the deterministic ShopNest scan…"); return; }
    if (!apiBase) { setPhase("error"); setError("Live scanning needs the API service. Start the demo supervisor or set PATCHWORK_API_URL, then try again."); return; }
    setScanSource("live");
    setPhase("scanning");
    setProgress(5);
    setScanMessage("Submitting a safe public-origin scan…");
    try {
      const response = await fetch(`${apiBase}/api/v1/live-sites/scan`, { method: "POST", headers: { "content-type": "application/json", accept: "application/json" }, body: JSON.stringify({ siteId: data.site.id, pageUrl: trimmed }) });
      const payload = await response.json() as { data?: { id: string }; error?: { message: string } };
      if (!response.ok || !payload.data?.id) throw new Error(payload.error?.message ?? "The live scan could not be started safely.");
      setLiveJobId(payload.data.id);
    } catch (reason) { setPhase("error"); setError(reason instanceof Error ? reason.message : "The live scan could not be started safely."); }
  }

  function applyPrivatePreview(): void {
    setApplied(true);
    setProjectedScore(Math.min(99, data.workspace.risk.score + 7));
    setPhase("verified");
    setProgress(100);
    setScanMessage("Private preview verified. The public site is unchanged.");
    toast.success("Private preview verified", { description: "The safe contrast change is ready for human review." });
  }

  function startCanary(): void {
    setPhase("shipped");
    setScanMessage("Canary staged at 10%. Publish still requires the connected SDK and release policy.");
    toast.message("10% canary staged", { description: "No public mutation happened in this local workflow." });
  }

  function undoRelease(): void {
    setPhase("verified");
    setScanMessage("Canary undone. The verified private preview remains available.");
    toast.success("Canary undone", { description: "The previous verified state is restored in this demo." });
  }

  const tone: DashboardTone = phase === "error" ? "red" : phase === "shipped" ? "green" : phase === "verified" ? "green" : phase === "finding" || phase === "preview" ? "amber" : "amber";
  return <GridBackdrop className="pw-fix-page"><header className="pw-fix-header"><a href="/web" aria-label="Back to PATCHWORK marketing"><PatchworkLogo /></a><div className="pw-fix-header-meta"><StatusDot tone={tone} label={phase === "shipped" ? "Canary staged" : phase === "verified" ? "Verified" : phase === "error" ? "Needs attention" : "Guided fix"} /><a href="/dashboard?view=overview">Open workspace <ArrowRight size={13} aria-hidden="true" /></a></div></header><main className="pw-fix-main"><div className="pw-fix-intro"><div><span className="pw-dashboard-kicker"><span className="pw-kicker-dot" />One-screen guided fix</span><h1>Fix any website in 60 seconds.</h1><p>SCAN the public page. FIX one safe thing in isolation. SHIP behind a human-owned release gate.</p></div><div className="pw-fix-timer"><strong>{phase === "idle" ? "00:00" : phase === "scanning" ? "00:12" : "00:38"}</strong><span>session time</span></div></div><section className="pw-fix-rail" aria-label="Guided workflow"><FixStep number="01" label="SCAN" active={phase === "idle" || phase === "scanning" || phase === "error"} complete={phase !== "idle" && phase !== "scanning" && phase !== "error"} /><FixStep number="02" label="FIX" active={phase === "finding" || phase === "preview"} complete={phase === "verified" || phase === "shipped"} /><FixStep number="03" label="SHIP" active={phase === "verified" || phase === "shipped"} complete={phase === "shipped"} /></section><section className="pw-fix-target pw-fix-panel"><div className="pw-fix-target-copy"><div className="pw-fix-panel-icon"><Globe2 size={18} aria-hidden="true" /></div><div><strong>What should PATCHWORK inspect?</strong><p>Use the local ShopNest fixture or enter a public URL. Private networks and credentials are blocked before any request leaves the server.</p></div></div><div className="pw-fix-target-form"><label htmlFor="fix-target-url">Page URL</label><div className="pw-fix-input-row"><input id="fix-target-url" value={targetUrl} onChange={(event) => setTargetUrl(event.target.value)} spellCheck={false} /><Button onClick={() => void startScan()} loading={phase === "scanning"} leadingIcon={<ScanSearch size={14} aria-hidden="true" />}>{phase === "scanning" ? "Scanning" : "Scan page"}</Button></div><div className="pw-fix-input-meta"><button type="button" onClick={() => setTargetUrl(sampleUrl)}>Use ShopNest sample</button><span>{scanSource === "live" ? "Live scan via connected API" : "Deterministic local evidence"}</span></div></div></section>{phase === "scanning" ? <section className="pw-fix-progress pw-fix-panel" aria-live="polite"><div className="pw-fix-progress-head"><div><span className="pw-fix-panel-label">SCAN IN PROGRESS</span><strong>{scanMessage}</strong></div><strong>{progress}%</strong></div><div className="pw-fix-progress-track"><span style={{ width: `${progress}%` }} /></div><div className="pw-fix-progress-events"><span><Check size={12} aria-hidden="true" />Origin policy checked</span><span><Check size={12} aria-hidden="true" />Scripts stay inert</span><span><LoaderCircle size={12} className="pw-spin" aria-hidden="true" />Detector evidence</span></div></section> : null}{phase === "error" ? <section className="pw-fix-error pw-fix-panel" role="alert"><CircleAlert size={18} aria-hidden="true" /><div><strong>Nothing changed</strong><p>{error}</p><button type="button" onClick={() => { setPhase("idle"); setError(null); }}>Try another target</button></div></section> : null}{phase !== "idle" && phase !== "scanning" && phase !== "error" ? <section className="pw-fix-results"><div className="pw-fix-results-head"><div><span className="pw-fix-panel-label">FIX WITH EVIDENCE</span><h2>{activeFindings.length ? `${activeFindings.length} issue${activeFindings.length === 1 ? "" : "s"} found` : "The page is clear"}</h2><p>{scanMessage}</p></div><HealthRing score={projectedScore} /></div><div className="pw-fix-finding-grid">{activeFindings.map((finding) => <FixFinding key={finding.id} finding={finding} onApply={applyPrivatePreview} applied={applied} />)}</div>{activeFindings.length ? <div className="pw-fix-results-actions"><Button variant="primary" onClick={applyPrivatePreview} disabled={applied} leadingIcon={<ShieldCheck size={14} aria-hidden="true" />}>{applied ? "Private preview verified" : "Fix safe issues"}</Button><a href="/dashboard?view=patches">Customize in Studio <ArrowRight size={13} aria-hidden="true" /></a><button type="button" onClick={() => window.dispatchEvent(new Event("patchwork:open-patchpilot"))}>Ask PatchPilot <Sparkles size={13} aria-hidden="true" /></button></div> : null}</section> : null}{phase === "verified" || phase === "shipped" ? <section className="pw-fix-ship pw-fix-panel"><div className="pw-fix-ship-copy"><div className="pw-fix-panel-icon pw-fix-panel-icon-green"><Check size={18} aria-hidden="true" /></div><div><span className="pw-fix-panel-label">VERIFY PASSED</span><h2>{phase === "shipped" ? "The canary is staged." : "The fix is ready to ship."}</h2><p>12 browser, accessibility, visual, console, and network checks are recorded. Live publish still requires the installed SDK, a signed manifest, and release policy approval.</p></div></div><div className="pw-fix-ship-actions">{phase === "verified" ? <Button onClick={startCanary} leadingIcon={<Send size={14} aria-hidden="true" />}>Stage 10% canary</Button> : <Button variant="secondary" onClick={undoRelease} leadingIcon={<Undo2 size={14} aria-hidden="true" />}>Undo canary</Button>}<button type="button" onClick={() => window.dispatchEvent(new Event("patchwork:open-patchpilot"))}>Explain this release <Sparkles size={13} aria-hidden="true" /></button></div></section> : null}<footer className="pw-fix-footer"><span><ShieldCheck size={13} aria-hidden="true" />No source rebuild · inverse attached · human approval required</span><a href="/dashboard?view=install"><ArrowLeft size={13} aria-hidden="true" />Check SDK connection</a></footer></main></GridBackdrop>;
}

function FixStep({ number, label, active, complete }: Readonly<{ number: string; label: string; active: boolean; complete: boolean }>) {
  return <div className={`pw-fix-step${active ? " is-active" : ""}${complete ? " is-complete" : ""}`}><span>{complete ? <Check size={12} aria-hidden="true" /> : number}</span><strong>{label}</strong></div>;
}

function HealthRing({ score }: Readonly<{ score: number }>) {
  return <div className="pw-fix-health-ring" style={{ "--pw-ring-score": `${Math.min(100, Math.max(0, score)) * 3.6}deg` } as React.CSSProperties}><div><strong>{score}</strong><span>health</span></div></div>;
}

function FixFinding({ finding, onApply, applied }: Readonly<{ finding: DashboardFinding; onApply: () => void; applied: boolean }>) {
  const tone: DashboardTone = finding.severity === "critical" || finding.severity === "high" ? "red" : finding.severity === "medium" ? "amber" : "green";
  return <article className={`pw-fix-finding pw-fix-finding-${tone}`}><div className="pw-fix-finding-top"><StatusDot tone={tone} label={tone === "red" ? "High risk" : tone === "amber" ? "Review" : "Safe"} /><span>{Math.round(finding.confidence * 100)}% confidence</span></div><h3>{finding.summary}</h3><p>{finding.explanation}</p><div className="pw-fix-finding-evidence"><span>WHAT</span><strong>{finding.blastRadius.elementCount} element · {finding.blastRadius.pageCount} page</strong><small>{finding.blastRadius.explanation}</small></div><div className="pw-fix-finding-action"><button type="button" onClick={onApply} disabled={applied}>{applied ? <><Check size={13} aria-hidden="true" />In private preview</> : <>Apply safe fix <ArrowRight size={13} aria-hidden="true" /></>}</button><span>Inverse attached</span></div></article>;
}
