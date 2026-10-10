"use client";

import { ArrowRight, CheckCircle2, Clock3, Eye, GitBranch, Info, ScanSearch, ShieldCheck, TriangleAlert } from "lucide-react";
import { useEffect, useState } from "react";
import { Card, DataList } from "./ui/data";
import { Badge, AvatarStack, StatusDot } from "./ui/navigation";
import { Button } from "./ui/button";
import { ProgressRing, StatusExplanation } from "./ui/feedback";
import { ReleasePipeline } from "./ui/signature-motion";
import { SeamDivider } from "./ui/seams";
import { toast } from "./ui/overlays";
import type { DashboardData, DashboardStage, DashboardView } from "./dashboard-types";

export function OverviewScreen({ data, onNavigate }: Readonly<{ data: DashboardData; onNavigate: (view: DashboardView) => void }>) {
  const { workspace } = data;
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  useEffect(() => { const started = Date.now(); const interval = window.setInterval(() => setElapsedSeconds(Math.floor((Date.now() - started) / 1000)), 1_000); return () => window.clearInterval(interval); }, []);
  const stageList: DashboardStage[] = [workspace.stages.scan, workspace.stages.fix, workspace.stages.ship];
  return <div className="pw-overview"><div className="pw-dashboard-heading"><div><span className="pw-dashboard-kicker"><span className="pw-kicker-dot" /> Operator workspace / production</span><h1 id="dashboard-page-title">Good morning, {firstName(data.site.owner)}.</h1><p>Here’s the shortest safe path through your live website.</p></div><div className="pw-dashboard-heading-actions"><Button size="sm" variant="secondary" leadingIcon={<Eye size={14} aria-hidden="true" />} onClick={() => toast.message("Opening the public ShopNest preview", { description: "The seeded incident remains isolated from the operator workspace." })}>View site</Button><Button size="sm" leadingIcon={<ScanSearch size={14} aria-hidden="true" />} onClick={() => onNavigate("scan")}>Scan again</Button></div></div>
    <section className="pw-next-action" aria-labelledby="next-action-title"><div className="pw-next-action-signal"><span className="pw-next-action-pulse" /><span className="pw-next-action-label">NEXT ACTION</span><strong>{workspace.nextAction.stage.toUpperCase()}</strong></div><div className="pw-next-action-copy"><h2 id="next-action-title">{workspace.nextAction.label}</h2><p>{workspace.nextAction.explanation}</p><div className="pw-next-action-meta"><span><Clock3 size={13} aria-hidden="true" /> This session {formatDuration(elapsedSeconds)}</span><span><ShieldCheck size={13} aria-hidden="true" /> No public changes made</span></div></div><Button size="lg" trailingIcon={<ArrowRight size={16} aria-hidden="true" />} onClick={() => onNavigate(viewFromHref(workspace.nextAction.href))}>Open next step</Button></section>
    <div className="pw-dashboard-grid pw-dashboard-grid-top"><Card eyebrow="Workspace risk" title={workspace.risk.label} action={<Badge tone={workspace.risk.tone}>{workspace.risk.score}/100</Badge>}><div className="pw-risk-card"><ProgressRing value={workspace.risk.score} label="safe" tone={workspace.risk.tone === "green" ? "green" : workspace.risk.tone === "red" ? "red" : "amber"} /><div><StatusExplanation tone={workspace.risk.tone} title={workspace.risk.label} description={workspace.risk.explanation} /><ul>{workspace.risk.factors.map((factor) => <li key={factor}>{factor}</li>)}</ul></div></div></Card><Card eyebrow="Current release" title={workspace.release?.title ?? "No production release"} action={<StatusDot tone={workspace.stages.ship.tone} label={workspace.release?.status ?? "Not connected"} />}><div className="pw-release-overview"><div className="pw-release-version"><span>VERSION</span><strong>{workspace.release?.version ?? "—"}</strong><code>{workspace.release?.id ?? "No release manifest"}</code></div><DataList items={[{ label: "Environment", value: workspace.release?.environment ?? "—" }, { label: "Canary", value: workspace.release?.rollout ? `${workspace.release.rollout.canaryPercent}%` : "—", detail: workspace.release?.rollout?.paused ? "Paused" : "Rolling safely" }]} /></div><ReleasePipeline current={workspace.release?.status === "live" ? 4 : 2} /></Card></div>
    <section className="pw-stage-section" aria-labelledby="stage-title"><div className="pw-section-heading"><div><span className="pw-dashboard-kicker">THE THREE VERBS</span><h2 id="stage-title">Every change has a visible seam.</h2></div><span className="pw-section-note">Plain English, evidence attached.</span></div><div className="pw-stage-grid">{stageList.map((stage, index) => <StageCard key={stage.stage} stage={stage} index={index} onOpen={() => onNavigate(viewFromHref(stage.href))} />)}</div></section>
    <div className="pw-dashboard-grid pw-dashboard-grid-bottom"><Card eyebrow="Recent activity" title="What changed" action={<Button size="sm" variant="quiet" trailingIcon={<ArrowRight size={13} aria-hidden="true" />} onClick={() => onNavigate("audit")}>Open audit</Button>}><ActivityList data={data} /></Card><Card eyebrow="People in the loop" title="Review ownership" action={<Badge tone="green">Evidence attached</Badge>}><div className="pw-review-card"><AvatarStack people={[{ name: data.site.owner }, { name: "Lena Ortiz" }, { name: "Owen Brooks" }]} /><strong>{data.site.owner} owns the next decision.</strong><p>PATCHWORK keeps reviewer context beside the patch so a safe change never depends on a private message.</p><Button size="sm" variant="secondary" leadingIcon={<GitBranch size={14} aria-hidden="true" />} onClick={() => onNavigate("reviews")}>Open review inbox</Button></div></Card></div>
    <SeamDivider label="SCANNED 8:00 AM UTC · SHOPNEST / PRODUCTION" />
  </div>;
}

function StageCard({ stage, index, onOpen }: Readonly<{ stage: DashboardStage; index: number; onOpen: () => void }>) {
  const toneIcon = stage.tone === "green" ? <CheckCircle2 size={16} aria-hidden="true" /> : stage.tone === "red" ? <TriangleAlert size={16} aria-hidden="true" /> : <Info size={16} aria-hidden="true" />;
  return <button type="button" className={`pw-stage-card pw-stage-${stage.tone}`} onClick={onOpen}><span className="pw-stage-index">0{index + 1}</span><div className="pw-stage-card-top"><span className="pw-stage-icon">{toneIcon}</span><span className="pw-stage-label">{stage.label}</span><span className="pw-stage-score">{stage.score}%</span></div><strong>{stage.headline}</strong><p>{stage.explanation}</p><span className="pw-stage-link">Open {stage.label.toLowerCase()} <ArrowRight size={13} aria-hidden="true" /></span></button>;
}

function ActivityList({ data }: Readonly<{ data: DashboardData }>) {
  return <ol className="pw-dashboard-activity">{data.workspace.recentActivity.slice(0, 5).map((item) => <li key={item.id}><span className={`pw-activity-dot pw-activity-${item.severity}`} aria-hidden="true" /><div><strong>{item.title}</strong><p>{item.detail}</p><time dateTime={item.timestamp}>{formatRelativeTime(item.timestamp)}</time></div></li>)}</ol>;
}

function firstName(name: string): string { return name.split(/\s+/)[0] ?? name; }
function formatDuration(seconds: number): string { return seconds < 60 ? `${seconds}s` : `${Math.floor(seconds / 60)}m ${seconds % 60}s`; }
function formatRelativeTime(value: string): string { const elapsedMinutes = Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 60_000)); return elapsedMinutes < 1 ? "just now" : elapsedMinutes === 1 ? "1 min ago" : elapsedMinutes < 60 ? `${elapsedMinutes} min ago` : `${Math.round(elapsedMinutes / 60)} hr ago`; }
function viewFromHref(href: string): DashboardView { const segment = href.split("/").filter(Boolean).at(-1); return segment === "scan" || segment === "patches" || segment === "releases" || segment === "incidents" || segment === "reviews" || segment === "audit" ? segment : "overview"; }
