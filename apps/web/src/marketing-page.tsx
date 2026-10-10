"use client";

import { useEffect, useRef, useState } from "react";
import { Check } from "lucide-react";
import { DemoSection, MarketingHero, ProofRail } from "./marketing-hero";
import { MarketingFooter, MarketingNav } from "./marketing-chrome";
import { AiProof, ComparisonAndFaq, EvidenceSection, FeatureBento, FinalCta, IntegrationMarquee, Playground, SecurityProof, ScrollStory, WorkflowCards } from "./marketing-sections";
import type { DemoStep } from "./marketing-engine";
import { nextDemoStep } from "./marketing-engine";

export default function MarketingPage() {
  const [demoStep, setDemoStep] = useState<DemoStep>("idle");
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const demoRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (startedAt === null || demoStep === "shipped") return;
    const interval = window.setInterval(() => setElapsed(Math.floor((Date.now() - startedAt) / 1_000)), 1_000);
    return () => window.clearInterval(interval);
  }, [demoStep, startedAt]);

  const beginDemo = () => {
    setStartedAt(Date.now());
    setElapsed(0);
    setDemoStep("scanned");
  };
  const advanceDemo = () => setDemoStep(nextDemoStep(demoStep));
  const resetDemo = () => {
    setStartedAt(null);
    setElapsed(0);
    setDemoStep("idle");
  };
  const openDemo = () => {
    demoRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return <main className="pw-marketing-shell" id="top" aria-label="Fix any website without redeploying it" data-workflow="SCAN. FIX. SHIP.">
    <MarketingNav />
    <MarketingHero onTryDemo={openDemo} />
    <ProofRail onOpenProof={() => document.getElementById("evidence")?.scrollIntoView({ behavior: "smooth" })} />
    <IntegrationMarquee />
    <section ref={demoRef} className="pw-marketing-demo-anchor" aria-label="Interactive PATCHWORK demo"><DemoSection step={demoStep} elapsed={elapsed} onStart={beginDemo} onAdvance={advanceDemo} onReset={resetDemo} /></section>
    <BeforeAfterSlider />
    <ScrollStory />
    <FeatureBento />
    <WorkflowCards />
    <Playground />
    <EvidenceSection />
    <SecurityProof />
    <AiProof />
    <ComparisonAndFaq />
    <FinalCta />
    <MarketingFooter />
  </main>;
}

function BeforeAfterSlider() {
  const [slider, setSlider] = useState(58);
  return <section className="pw-marketing-repair" id="repair" aria-labelledby="repair-title"><div className="pw-marketing-section-heading"><span className="pw-marketing-kicker"><span className="pw-marketing-pulse" /> ONE PATCH, TWO STATES</span><h2 id="repair-title">See the seam<br /><em>before it ships.</em></h2><p>Drag the handle across a measured visual diff. PATCHWORK keeps the old state, the proposed state, and the inverse operation attached to the same release.</p><div className="pw-repair-proof"><span><CheckMark /> Old state preserved</span><span><CheckMark /> Inverse signed</span><span><CheckMark /> Public traffic untouched</span></div></div><div className="pw-before-after"><div className="pw-before-after-state pw-before-state"><span>BEFORE / BLOCKED</span><div className="pw-repair-layout"><div className="pw-repair-product"><span>SHOPNEST</span></div><section><strong>$248</strong><span className="pw-repair-button">Add to cart</span></section></div><p>Click intercepted by a stale promo layer</p></div><div className="pw-before-after-state pw-after-state" style={{ clipPath: `inset(0 0 0 ${slider}%)` }}><span>AFTER / VERIFIED</span><div className="pw-repair-layout"><div className="pw-repair-product"><span>SHOPNEST</span></div><section><strong>$248</strong><span className="pw-repair-button">Add to cart <CheckMark /></span></section></div><p>Target restored, inverse operation signed</p></div><div className="pw-slider-handle" style={{ left: `${slider}%` }} aria-hidden="true"><span /></div><label className="pw-slider-control" htmlFor="repair-slider">Before / after position<input id="repair-slider" type="range" min="0" max="100" value={slider} onChange={(event) => setSlider(Number(event.target.value))} /></label></div></section>;
}

function CheckMark() { return <span className="pw-inline-check" aria-hidden="true"><Check size={11} /></span>; }
