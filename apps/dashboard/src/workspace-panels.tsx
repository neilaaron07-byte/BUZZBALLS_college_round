"use client";

import { ArrowRight, Check, CircleAlert, FileCheck2, Gauge, GitMerge, Layers3, ShieldCheck, TriangleAlert } from "lucide-react";
import { Button } from "./ui/button";
import { Card } from "./ui/data";
import { ProgressBar } from "./ui/feedback";
import { Badge, StatusDot } from "./ui/navigation";
import { SeamDivider } from "./ui/seams";
import { blastRadiusLabel, evidenceNarrative, policyChecks, releaseNarrative, releaseStatusLabel, rolloutDecision, rolloutState, workspaceMetrics } from "./dashboard-engine";
import type { DashboardData, DashboardTone, DashboardView } from "./dashboard-types";
import type { RolloutIntent } from "./dashboard-engine";

export function WorkspaceMetricStrip({ data, onNavigate }: Readonly<{ data: DashboardData; onNavigate: (view: DashboardView) => void }>) {
  const metrics = workspaceMetrics(data.workspace);
  const items: ReadonlyArray<{ label: string; value: string; detail: string; tone: DashboardTone; view: DashboardView }> = [
    { label: "Findings", value: String(metrics.findingCount), detail: metrics.criticalFindingCount ? `${metrics.criticalFindingCount} critical` : "Needs review", tone: metrics.criticalFindingCount ? "red" : "amber", view: "scan" },
    { label: "Verified patches", value: String(metrics.verifiedPatchCount), detail: "Safe operations", tone: metrics.verifiedPatchCount ? "green" : "amber", view: "patches" },
    { label: "Open conflicts", value: String(metrics.openConflictCount), detail: metrics.openConflictCount ? "Human decision" : "Clear", tone: metrics.openConflictCount ? "amber" : "green", view: "conflicts" },
    { label: "Canary", value: `${metrics.canaryPercent}%`, detail: "Public traffic", tone: metrics.canaryPercent < 100 ? "amber" : "green", view: "releases" },
    { label: "Evidence health", value: `${metrics.healthScore}`, detail: releaseStatusLabel(data.workspace.release), tone: metrics.readiness === "blocked" ? "red" : metrics.readiness === "review" ? "amber" : "green", view: "evidence" },
  ];
  return <section className="pw-workspace-metric-strip" aria-label="Workspace metrics">{items.map((item) => <button type="button" className={`pw-workspace-metric pw-workspace-metric-${item.tone}`} key={item.label} onClick={() => onNavigate(item.view)}><span>{item.label}</span><strong>{item.value}</strong><small>{item.detail}<ArrowRight size={11} aria-hidden="true" /></small></button>)}</section>;
}

export function FindingSeverityMap({ data, onNavigate }: Readonly<{ data: DashboardData; onNavigate: (view: DashboardView) => void }>) {
  const counts = { critical: 0, high: 0, medium: 0, low: 0 };
  data.workspace.findings.forEach((finding) => { counts[finding.severity] += 1; });
  const total = Math.max(1, data.workspace.findings.length);
  const rows: ReadonlyArray<{ key: keyof typeof counts; label: string; tone: DashboardTone; icon: React.ReactNode }> = [
    { key: "critical", label: "Critical", tone: "red", icon: <TriangleAlert size={13} aria-hidden="true" /> },
    { key: "high", label: "High", tone: "red", icon: <CircleAlert size={13} aria-hidden="true" /> },
    { key: "medium", label: "Medium", tone: "amber", icon: <Gauge size={13} aria-hidden="true" /> },
    { key: "low", label: "Low", tone: "green", icon: <Check size={13} aria-hidden="true" /> },
  ];
  return <Card eyebrow="SCAN / severity map" title="Where the risk sits" action={<Button size="sm" variant="quiet" trailingIcon={<ArrowRight size={12} aria-hidden="true" />} onClick={() => onNavigate("scan")}>Open findings</Button>}><div className="pw-severity-map">{rows.map((row) => <button type="button" className="pw-severity-row" key={row.key} onClick={() => onNavigate("scan")}><span className={`pw-severity-icon pw-severity-${row.tone}`}>{row.icon}</span><span><strong>{row.label}</strong><small>{counts[row.key]} finding{counts[row.key] === 1 ? "" : "s"}</small></span><i><b style={{ width: `${Math.round((counts[row.key] / total) * 100)}%` }} /></i><Badge tone={row.tone}>{counts[row.key]}</Badge></button>)}</div><p className="pw-severity-footnote">A finding stays review-only until its target, operation, inverse, and blast radius are explicit.</p></Card>;
}

export function EvidenceSnapshot({ data, onNavigate }: Readonly<{ data: DashboardData; onNavigate: (view: DashboardView) => void }>) {
  const finding = data.workspace.findings[0];
  const patch = data.workspace.patches[0];
  return <Card eyebrow="FIX / evidence handoff" title="The proof travels with the patch" action={<StatusDot tone="green" label="Attached" />}><div className="pw-evidence-snapshot"><div className="pw-evidence-snapshot-icon"><FileCheck2 size={18} aria-hidden="true" /></div><div><strong>{patch?.title ?? "No patch selected"}</strong><p>{finding ? evidenceNarrative(finding) : "No finding evidence is waiting for review."}</p></div></div><div className="pw-evidence-snapshot-grid"><span><small>Target</small><strong>{finding ? `${Math.round(finding.confidence * 100)}%` : "—"}</strong></span><span><small>Blast radius</small><strong>{finding ? blastRadiusLabel(finding) : "—"}</strong></span><span><small>Inverse</small><strong>Attached</strong></span></div><Button size="sm" variant="secondary" leadingIcon={<ShieldCheck size={13} aria-hidden="true" />} onClick={() => onNavigate("verification")}>Open verification proof</Button></Card>;
}

export function PolicyChecklist({ data, onNavigate }: Readonly<{ data: DashboardData; onNavigate: (view: DashboardView) => void }>) {
  const checks = policyChecks(data.workspace);
  return <Card eyebrow="SHIP / policy" title="What must be true before traffic moves" action={<Badge tone={checks.some((check) => check.tone === "red") ? "red" : checks.some((check) => check.tone === "amber") ? "amber" : "green"}>{checks.filter((check) => check.status === "passed").length}/{checks.length} passed</Badge>}><div className="pw-policy-checklist">{checks.map((check) => <button type="button" className="pw-policy-checklist-row" key={check.id} onClick={() => onNavigate(check.href)}><span className={`pw-policy-checklist-icon pw-policy-checklist-${check.tone}`}>{check.tone === "green" ? <Check size={13} aria-hidden="true" /> : <TriangleAlert size={13} aria-hidden="true" />}</span><span><strong>{check.label}</strong><small>{check.detail}</small></span><Badge tone={check.tone}>{check.status === "passed" ? "Passed" : check.status === "blocked" ? "Blocked" : "Review"}</Badge><ArrowRight size={13} aria-hidden="true" /></button>)}</div></Card>;
}

export function ReleaseDecisionPanel({ data, onNavigate, onIntent }: Readonly<{ data: DashboardData; onNavigate: (view: DashboardView) => void; onIntent?: (intent: RolloutIntent) => void }>) {
  const metrics = workspaceMetrics(data.workspace);
  const state = rolloutState(data.workspace.release);
  const decision = rolloutDecision(state, "promote", metrics);
  return <Card eyebrow="SHIP / next decision" title="Read the release before the action" action={<StatusDot tone={decision.tone} label={decision.allowed ? "Ready" : "Held"} />}><div className="pw-release-decision"><div className={`pw-release-decision-icon pw-release-decision-${decision.tone}`}>{decision.allowed ? <Check size={18} aria-hidden="true" /> : <TriangleAlert size={18} aria-hidden="true" />}</div><div><strong>{decision.title}</strong><p>{decision.detail}</p></div></div><p className="pw-release-decision-narrative">{releaseNarrative(data.workspace.release, metrics)}</p><ProgressBar value={metrics.canaryPercent} label="Public traffic" /><div className="pw-release-decision-actions"><Button size="sm" variant="secondary" onClick={() => onNavigate("releases")}>Open release control</Button>{onIntent ? <Button size="sm" variant="quiet" leadingIcon={<GitMerge size={13} aria-hidden="true" />} onClick={() => onIntent(decision.allowed ? "promote" : "pause")}>{decision.allowed ? "Promote" : "Pause safely"}</Button> : null}</div></Card>;
}

export function StageLegend() {
  return <div className="pw-stage-legend" aria-label="PATCHWORK stage legend"><span><Layers3 size={13} aria-hidden="true" /><strong>SCAN</strong><small>observe</small></span><span><GitMerge size={13} aria-hidden="true" /><strong>FIX</strong><small>patch</small></span><span><ShieldCheck size={13} aria-hidden="true" /><strong>SHIP</strong><small>release</small></span></div>;
}

export function WorkspaceSeam({ label = "EVIDENCE → ACTION · EVERY STATE EXPLAINS THE NEXT MOVE" }: Readonly<{ label?: string }>) {
  return <SeamDivider label={label} />;
}
