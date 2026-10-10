"use client";

import { Activity, ArrowRight, Check, CircleAlert, CloudOff, GitMerge, RefreshCw, ScanSearch, ShieldCheck, TriangleAlert } from "lucide-react";
import { useMemo, useState } from "react";
import { buildPatchDraft, patchNextAction, validatePatchDraft } from "./patch-workflow-engine";
import { buildReleaseControl, buildAuditSummary } from "./release-health-engine";
import { buildScanSession } from "./scan-session-engine";
import type { DashboardData, DashboardTone, DashboardView } from "./dashboard-types";
import { Card } from "./ui/data";
import { Badge, StatusDot } from "./ui/navigation";
import { Button } from "./ui/button";
import { ProgressBar } from "./ui/feedback";
import { toast } from "./ui/overlays";

type WorkflowPanelProps = {
  data: DashboardData;
  onNavigate: (view: DashboardView) => void;
};

type WorkflowStatus = {
  id: string;
  stage: "SCAN" | "FIX" | "SHIP";
  tone: DashboardTone;
  title: string;
  detail: string;
  metric: string;
  metricLabel: string;
  action: string;
  view: DashboardView;
  icon: typeof ScanSearch;
};

export function DashboardWorkflowPanels({ data, onNavigate }: WorkflowPanelProps) {
  const scan = useMemo(() => buildScanSession(data), [data]);
  const patch = data.workspace.patches.at(0);
  const draft = patch ? buildPatchDraft(data, patch) : null;
  const validation = draft ? validatePatchDraft(draft) : null;
  const release = useMemo(() => buildReleaseControl(data), [data]);
  const statuses: WorkflowStatus[] = [
    { id: "scan", stage: "SCAN", tone: scan.tone, title: scan.headline, detail: `${scan.totals.detectorCount} detectors · ${scan.totals.clearCount} clear · target ${scan.target}`, metric: String(scan.totals.findingCount), metricLabel: "finding", action: "Inspect evidence", view: "scan", icon: ScanSearch },
    { id: "fix", stage: "FIX", tone: validation?.tone ?? "amber", title: draft ? patchNextAction(validation!, draft) : "Start from a finding", detail: draft ? `${draft.operations.length} operation · ${draft.inverseOperations.length} inverse · ${draft.target.confidence * 100}% target confidence` : "A patch starts from a measured target.", metric: draft ? String(draft.operations.length) : "0", metricLabel: "operation", action: "Open patch safety", view: "patches", icon: GitMerge },
    { id: "ship", stage: "SHIP", tone: release.tone, title: release.headline, detail: `${release.healthScore}/100 health · ${release.gates.filter((gate) => gate.state === "passed").length}/${release.gates.length} gates passed`, metric: `${release.canaryPercent}%`, metricLabel: "canary", action: "Review release", view: "releases", icon: ShieldCheck },
  ];
  return <section className="pw-workflow-panel-section" aria-labelledby="workflow-panel-title"><div className="pw-section-heading"><div><span className="pw-dashboard-kicker">THE DECISION GRAPH</span><h2 id="workflow-panel-title">Evidence moves with the change.</h2></div><span className="pw-section-note">Typed SCAN → FIX → SHIP handoff</span></div><div className="pw-workflow-panel-grid">{statuses.map((status) => <WorkflowStatusCard key={status.id} status={status} onNavigate={onNavigate} />)}</div><div className="pw-workflow-lower-grid"><WorkspaceRecoveryPanel data={data} onNavigate={onNavigate} /><AuditActivityPanel data={data} onNavigate={onNavigate} /></div></section>;
}

function WorkflowStatusCard({ status, onNavigate }: Readonly<{ status: WorkflowStatus; onNavigate: (view: DashboardView) => void }>) {
  const Icon = status.icon;
  return <Card eyebrow={`${status.stage} / live contract`} title={status.title} action={<StatusDot tone={status.tone} label={status.tone === "green" ? "Verified" : status.tone === "amber" ? "Review" : "Blocked"} />}><div className={`pw-workflow-status-card pw-workflow-status-${status.tone}`}><span className="pw-workflow-status-icon"><Icon size={17} aria-hidden="true" /></span><div><strong>{status.metric}<small>{status.metricLabel}</small></strong><p>{status.detail}</p></div></div><Button size="sm" variant="secondary" trailingIcon={<ArrowRight size={13} aria-hidden="true" />} onClick={() => onNavigate(status.view)}>{status.action}</Button></Card>;
}

function WorkspaceRecoveryPanel({ data, onNavigate }: WorkflowPanelProps) {
  const [retried, setRetried] = useState(false);
  const isSeed = data.source === "seed";
  const retry = () => { setRetried(true); toast.message("API retry completed", { description: "The deterministic local evidence remains available while the operator connection is offline." }); };
  return <Card eyebrow="WORKSPACE / recovery" title={isSeed ? "Local evidence is keeping you moving" : "API workspace is connected"} action={<StatusDot tone={isSeed ? "amber" : "green"} label={isSeed ? "Offline-safe" : "Connected"} />}><div className="pw-workspace-recovery"><span className={`pw-workspace-recovery-icon pw-recovery-${isSeed ? "amber" : "green"}`}>{isSeed ? <CloudOff size={17} aria-hidden="true" /> : <Check size={17} aria-hidden="true" />}</span><div><strong>{retried ? "Retry recorded" : isSeed ? "API connection is offline" : "Workspace data is current"}</strong><p>{isSeed ? "PATCHWORK is showing a named, deterministic ShopNest snapshot. Nothing from this local mode can publish a change." : "The API is serving the current workspace read model and release evidence."}</p></div></div><div className="pw-workspace-recovery-actions"><Button size="sm" variant="secondary" leadingIcon={<RefreshCw size={13} aria-hidden="true" />} onClick={retry}>{retried ? "Retry again" : "Retry connection"}</Button><Button size="sm" variant="quiet" onClick={() => onNavigate("install")}>Open connection guide</Button></div></Card>;
}

function AuditActivityPanel({ data, onNavigate }: WorkflowPanelProps) {
  const summary = useMemo(() => buildAuditSummary(data), [data]);
  return <Card eyebrow="SHIP / audit handoff" title="Recent decisions stay traceable" action={<StatusDot tone={summary.tone} label={summary.chainValid ? "Chain intact" : "Chain broken"} />}><div className="pw-audit-activity-list">{summary.records.slice(-3).reverse().map((record) => <button type="button" key={record.id} onClick={() => onNavigate("audit")}><span className={`pw-audit-activity-icon pw-recovery-${record.tone}`}><Activity size={13} aria-hidden="true" /></span><span><strong>{record.action}</strong><small>{record.detail}</small></span><ArrowRight size={12} aria-hidden="true" /></button>)}</div><p className="pw-audit-activity-copy">{summary.eventCount} events · {summary.hash}</p><Button size="sm" variant="secondary" onClick={() => onNavigate("audit")}>Open audit trail</Button></Card>;
}

export function WorkflowEmptyState({ stage, onCreate }: Readonly<{ stage: "scan" | "fix" | "ship"; onCreate: () => void }>) {
  const copy = { scan: { title: "No scan evidence yet", detail: "Capture a page snapshot before proposing a change.", label: "Start a scan", icon: ScanSearch }, fix: { title: "No patch draft yet", detail: "A safe patch starts from a uniquely resolved finding.", label: "Open findings", icon: GitMerge }, ship: { title: "No release candidate yet", detail: "Verification evidence is required before release control appears.", label: "Review verification", icon: ShieldCheck } }[stage];
  const Icon = copy.icon;
  return <div className="pw-workflow-empty"><span><Icon size={18} aria-hidden="true" /></span><strong>{copy.title}</strong><p>{copy.detail}</p><Button size="sm" variant="secondary" onClick={onCreate}>{copy.label}</Button></div>;
}

export function WorkflowErrorState({ title, detail, onRetry }: Readonly<{ title: string; detail: string; onRetry: () => void }>) {
  return <div className="pw-workflow-error"><span><CircleAlert size={18} aria-hidden="true" /></span><div><strong>{title}</strong><p>{detail}</p></div><Button size="sm" variant="secondary" leadingIcon={<RefreshCw size={13} aria-hidden="true" />} onClick={onRetry}>Retry safely</Button></div>;
}

export function WorkflowProgress({ label, value, detail, tone = "violet" }: Readonly<{ label: string; value: number; detail: string; tone?: DashboardTone | "violet" }>) {
  return <div className={`pw-workflow-progress pw-workflow-progress-${tone}`}><div><span>{label}</span><strong>{value}%</strong></div><ProgressBar value={value} label={`${label} progress`} /><small>{detail}</small></div>;
}

export function WorkflowGateList({ gates, onNavigate }: Readonly<{ gates: readonly { id: string; label: string; state: string; tone: DashboardTone; evidence: string }[]; onNavigate: (view: DashboardView) => void }>) {
  const routeFor = (id: string): DashboardView => id === "verification" ? "verification" : id === "review" ? "reviews" : id === "health" ? "incidents" : "releases";
  return <div className="pw-workflow-gate-list">{gates.map((gate) => <button type="button" key={gate.id} onClick={() => onNavigate(routeFor(gate.id))}><span className={`pw-workflow-gate-icon pw-recovery-${gate.tone}`}>{gate.tone === "green" ? <Check size={13} aria-hidden="true" /> : <TriangleAlert size={13} aria-hidden="true" />}</span><span><strong>{gate.label}</strong><small>{gate.evidence}</small></span><Badge tone={gate.tone}>{gate.state}</Badge><ArrowRight size={12} aria-hidden="true" /></button>)}</div>;
}

export function DecisionLegend() {
  return <div className="pw-decision-legend"><span><i className="pw-legend-dot pw-legend-green" /> Verified means measured and attached.</span><span><i className="pw-legend-dot pw-legend-amber" /> Review means bounded, not public.</span><span><i className="pw-legend-dot pw-legend-red" /> Blocked means do not promote.</span></div>;
}
