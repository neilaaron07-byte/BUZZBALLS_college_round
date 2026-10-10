"use client";

import { Check, Copy, GitMerge, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { Button } from "./button";

export function CodeBlock({ code, language = "patch" }: Readonly<{ code: string; language?: string }>) {
  const [copied, setCopied] = useState(false);
  return <div className="pw-code-block"><div className="pw-code-header"><span>{language}</span><button type="button" onClick={() => { setCopied(true); void navigator.clipboard?.writeText(code); setTimeout(() => setCopied(false), 1400); }}>{copied ? <Check size={13} aria-hidden="true" /> : <Copy size={13} aria-hidden="true" />}<span>{copied ? "Copied" : "Copy"}</span></button></div><pre><code>{code}</code></pre></div>;
}

export function JSONViewer({ value }: Readonly<{ value: unknown }>) {
  return <CodeBlock language="json" code={JSON.stringify(value, null, 2)} />;
}

export function DiffViewer({ before, after }: Readonly<{ before: string; after: string }>) {
  return <div className="pw-diff-viewer"><div><span className="pw-diff-label pw-diff-remove">Before</span><pre>{before}</pre></div><div><span className="pw-diff-label pw-diff-add">After</span><pre>{after}</pre></div></div>;
}

export function Timeline({ items }: Readonly<{ items: ReadonlyArray<{ title: string; detail: string; time: string; tone?: "green" | "amber" | "violet" }> }>) {
  return <ol className="pw-timeline">{items.map((item) => <li key={`${item.time}-${item.title}`}><span className={`pw-timeline-dot pw-timeline-dot-${item.tone ?? "violet"}`} aria-hidden="true" /><div><div className="pw-timeline-top"><strong>{item.title}</strong><time>{item.time}</time></div><p>{item.detail}</p></div></li>)}</ol>;
}

export function Sparkline({ points, tone = "violet", label }: Readonly<{ points: readonly number[]; tone?: "violet" | "green" | "amber" | "red"; label: string }>) {
  const max = Math.max(...points, 1);
  const min = Math.min(...points, 0);
  const path = points.map((point, index) => `${(index / Math.max(points.length - 1, 1)) * 100},${100 - ((point - min) / Math.max(max - min, 1)) * 100}`).join(" ");
  return <svg className={`pw-sparkline pw-sparkline-${tone}`} viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label={label}><polyline points={path} fill="none" vectorEffect="non-scaling-stroke" /></svg>;
}

export function ChartFrame({ title, value, children }: Readonly<{ title: string; value: string; children: React.ReactNode }>) {
  return <div className="pw-chart-frame"><div className="pw-chart-header"><span>{title}</span><strong>{value}</strong></div><div className="pw-chart-area">{children}</div></div>;
}

export function ResolverSignals({ signals }: Readonly<{ signals: ReadonlyArray<{ label: string; value: number }> }>) {
  return <div className="pw-resolver-signals">{signals.map((signal) => <div key={signal.label}><span>{signal.label}</span><div><span style={{ width: `${signal.value}%` }} /></div><strong>{signal.value}%</strong></div>)}</div>;
}

export function MergePane({ left, right, merged, onAccept }: Readonly<{ left: string; right: string; merged: string; onAccept?: () => void }>) {
  return <div className="pw-merge-pane"><div className="pw-merge-column"><span>Patch A</span><code>{left}</code></div><div className="pw-merge-column"><span>Patch B</span><code>{right}</code></div><div className="pw-merge-result"><span><GitMerge size={13} aria-hidden="true" /> Suggested merge</span><code>{merged}</code>{onAccept ? <Button size="sm" variant="secondary" leadingIcon={<ShieldCheck size={14} aria-hidden="true" />} onClick={onAccept}>Accept merge</Button> : null}</div></div>;
}
