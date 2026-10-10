"use client";

import { motion, useReducedMotion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "./button";
import { ProgressRing } from "./feedback";
import { cx } from "./utils";

export function SpotlightSurface({ children }: Readonly<{ children: React.ReactNode }>) {
  const [point, setPoint] = useState({ x: 50, y: 20 });
  return <div className="pw-spotlight-surface" style={{ "--spotlight-x": `${point.x}%`, "--spotlight-y": `${point.y}%` } as React.CSSProperties} onPointerMove={(event) => { const rect = event.currentTarget.getBoundingClientRect(); setPoint({ x: ((event.clientX - rect.left) / rect.width) * 100, y: ((event.clientY - rect.top) / rect.height) * 100 }); }}>{children}</div>;
}

export function MagneticButton({ children, onClick }: Readonly<{ children: React.ReactNode; onClick?: () => void }>) {
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const reduceMotion = useReducedMotion();
  return <motion.div className="pw-magnetic-button" animate={{ x: reduceMotion ? 0 : offset.x, y: reduceMotion ? 0 : offset.y }} transition={{ type: "spring", stiffness: 300, damping: 30 }} onPointerMove={(event) => { if (reduceMotion) return; const rect = event.currentTarget.getBoundingClientRect(); setOffset({ x: (event.clientX - rect.left - rect.width / 2) * 0.12, y: (event.clientY - rect.top - rect.height / 2) * 0.12 }); }} onPointerLeave={() => setOffset({ x: 0, y: 0 })}><Button onClick={onClick}>{children}</Button></motion.div>;
}

export function TiltCard({ children }: Readonly<{ children: React.ReactNode }>) {
  return <motion.div className="pw-tilt-card" whileHover={{ rotateX: 3, rotateY: -3, y: -3 }} transition={{ type: "spring", stiffness: 300, damping: 30 }} style={{ transformPerspective: 900 }}>{children}</motion.div>;
}

export function RepairMorph() {
  const [fixed, setFixed] = useState(false);
  return <div className={`pw-repair-morph ${fixed ? "is-fixed" : "is-broken"}`}><div className="pw-repair-window"><div className="pw-repair-window-bar"><span /><span /><span /></div><div className="pw-repair-content"><span className="pw-repair-nav" /><div className="pw-repair-card"><span /><span /><span /></div><button type="button" className="pw-repair-action" onClick={() => setFixed((value) => !value)}>{fixed ? "Buy now" : "Buy now"}</button><span className="pw-repair-seam" aria-hidden="true" /></div></div><span className="pw-repair-label">{fixed ? "Fixed · seam released" : "Broken · z-index collision"}</span></div>;
}

export function BeforeAfterSlider() {
  const [value, setValue] = useState(58);
  return <div className="pw-before-after"><div className="pw-before-after-base"><span>PUBLIC</span><strong>Buy now</strong></div><div className="pw-before-after-patch" style={{ width: `${value}%` }}><span>PATCHED</span><strong>Buy now</strong></div><input type="range" min="0" max="100" value={value} onChange={(event) => setValue(Number(event.target.value))} aria-label="Before and after comparison" /><div className="pw-before-after-handle" style={{ left: `${value}%` }} aria-hidden="true" /></div>;
}

export function ArchitectureBeams() {
  return <div className="pw-architecture-beams" aria-hidden="true"><span /><span /><span /><span /></div>;
}

export function StoryRail({ steps }: Readonly<{ steps: ReadonlyArray<string> }>) {
  const [active, setActive] = useState(0);
  return <div className="pw-story-rail"><div className="pw-story-rail-line"><span style={{ height: `${((active + 1) / steps.length) * 100}%` }} /></div><div className="pw-story-rail-steps">{steps.map((step, index) => <button type="button" className={cx(index === active && "is-active")} onClick={() => setActive(index)} key={step}><i>{String(index + 1).padStart(2, "0")}</i><span>{step}</span></button>)}</div><div className="pw-story-rail-copy"><span>STEP {String(active + 1).padStart(2, "0")}</span><strong>{steps[active]}</strong><p>{active === 0 ? "A finding with evidence, confidence, and blast radius." : active === 1 ? "A small operation that can be previewed without risk." : active === 2 ? "Browser proof turns a proposed change into a safe release." : active === 3 ? "A signed canary keeps the blast radius bounded." : "Undo returns to the last healthy manifest."}</p></div></div>;
}

export function NumberTicker({ value, label }: Readonly<{ value: number; label: string }>) {
  return <div className="pw-number-ticker"><motion.strong key={value} initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: .32, ease: [0.2, 0, 0, 1] }}>{value.toLocaleString()}</motion.strong><span>{label}</span></div>;
}

export function HealthRingAnimation({ value }: Readonly<{ value: number }>) {
  return <motion.div initial={{ scale: .92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 300, damping: 30 }}><ProgressRing value={value} label="health" tone="green" /></motion.div>;
}

export function ReleasePipeline({ current = 2 }: Readonly<{ current?: number }>) {
  const steps = ["Scan", "Review", "Verify", "Canary", "Ship"];
  return <div className="pw-release-pipeline">{steps.map((step, index) => <div className={cx(index < current && "is-done", index === current && "is-current")} key={step}><span className="pw-release-node">{String(index + 1).padStart(2, "0")}</span><strong>{step}</strong>{index < steps.length - 1 ? <i aria-hidden="true" /> : null}</div>)}</div>;
}

export function RollbackTimeMachine() {
  const releases = ["rel_138 · healthy", "rel_139 · healthy", "rel_140 · canary", "rel_141 · paused", "rel_142 · current"];
  const [value, setValue] = useState(releases.length - 1);
  return <div className="pw-time-machine"><div className="pw-time-machine-head"><span>TIME MACHINE</span><strong>{releases[value]}</strong></div><input type="range" min="0" max={releases.length - 1} value={value} onChange={(event) => setValue(Number(event.target.value))} aria-label="Select release to restore" /><div className="pw-time-machine-ticks">{releases.map((release, index) => <button type="button" className={index === value ? "is-active" : ""} onClick={() => setValue(index)} key={release}>{release.split(" · ")[0]}</button>)}</div><span className="pw-time-machine-note">{value === releases.length - 1 ? "Current release is healthy." : "Rollback preview only — the public site is unchanged."}</span></div>;
}

export function PreviewMorph() {
  const [patched, setPatched] = useState(false);
  return <button type="button" className={`pw-preview-morph ${patched ? "is-patched" : ""}`} onClick={() => setPatched((value) => !value)}><span className="pw-preview-browser-bar">{patched ? "Isolated patch preview" : "Public storefront"}</span><span className="pw-preview-browser-body"><i /><i /><i /><strong>{patched ? "Checkout restored" : "Checkout unavailable"}</strong><small>{patched ? "The change is private until you ship." : "A release collision is blocking the action."}</small></span></button>;
}

export function ShipConfetti({ onUndo }: Readonly<{ onUndo?: () => void }>) {
  const [shipped, setShipped] = useState(false);
  const pieces = useMemo(() => Array.from({ length: 12 }, (_, index) => index), []);
  return <div className={`pw-ship-confetti ${shipped ? "is-shipped" : ""}`}><div className="pw-confetti-field" aria-hidden="true">{pieces.map((piece) => <i style={{ "--piece": piece } as React.CSSProperties} key={piece} />)}</div>{shipped ? <div className="pw-ship-toast"><span>Release shipped</span><button type="button" onClick={() => { setShipped(false); onUndo?.(); }}>Undo</button></div> : <Button onClick={() => setShipped(true)}>Ship release</Button>}</div>;
}

export function AiOrb({ text = "PatchPilot is ready" }: Readonly<{ text?: string }>) {
  const [streaming, setStreaming] = useState(false);
  const [visible, setVisible] = useState(text);
  useEffect(() => { if (!streaming) return; let index = 0; const timer = window.setInterval(() => { index += 1; setVisible(text.slice(0, index)); if (index >= text.length) { window.clearInterval(timer); setStreaming(false); } }, 28); return () => window.clearInterval(timer); }, [streaming, text]);
  return <div className="pw-ai-orb-row"><button type="button" className={`pw-ai-orb ${streaming ? "is-thinking" : ""}`} onClick={() => { setVisible(""); setStreaming(true); }} aria-label="Ask PatchPilot"><span /></button><div><span className="pw-gallery-kicker">PATCHPILOT {streaming ? "· THINKING" : "· READY"}</span><strong>{visible || "Thinking through the conflict…"}</strong></div></div>;
}

export function DomTreeVisualizer() {
  return <div className="pw-dom-tree"><div><span className="pw-dom-node is-root">main</span><span className="pw-dom-line" /></div><div className="pw-dom-child"><span className="pw-dom-node">section</span><span className="pw-dom-line" /></div><div className="pw-dom-child pw-dom-child-deep"><span className="pw-dom-node is-target">button · Buy now</span><span className="pw-dom-confidence">98%</span></div></div>;
}

export function AuditChain({ entries }: Readonly<{ entries: ReadonlyArray<string> }>) {
  const [tampered, setTampered] = useState(false);
  return <div className={`pw-audit-chain ${tampered ? "is-tampered" : ""}`}><div className="pw-audit-chain-status"><span>{tampered ? "Chain broken" : "Chain intact"}</span><button type="button" onClick={() => setTampered((value) => !value)}>{tampered ? "Repair fixture" : "Run tamper test"}</button></div><div className="pw-audit-chain-nodes">{entries.map((entry, index) => <div key={entry}><span className="pw-audit-node">{String(index + 1).padStart(2, "0")}</span><strong>{entry}</strong>{index < entries.length - 1 ? <i aria-hidden="true" /> : null}</div>)}</div></div>;
}

export function IntegrationMarquee() {
  const integrations = ["Git source", "Browser runner", "Error stream", "Edge cache", "Audit journal", "Team review"];
  return <div className="pw-integration-marquee" aria-label="PATCHWORK integrations">{[...integrations, ...integrations].map((name, index) => <span key={`${name}-${index}`}>{name}<i aria-hidden="true" /></span>)}</div>;
}
