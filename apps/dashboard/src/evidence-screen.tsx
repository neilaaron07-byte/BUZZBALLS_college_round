"use client";

import { BarChart3, CheckCircle2, Copy, Gauge, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "./ui/button";
import { Banner, ProgressBar, ProgressRing, StatusExplanation } from "./ui/feedback";
import { Badge, StatusDot } from "./ui/navigation";
import { Card, DataList, Table } from "./ui/data";
import { toast } from "./ui/overlays";
import { SeamDivider } from "./ui/seams";
import type { DashboardData, DashboardView } from "./dashboard-types";

const measured = [
  { key: "resolver", label: "Resolver benchmark", value: "200 scenarios", detail: "Moved, renamed, duplicated, missing, and ambiguous targets", tone: "green" as const, status: "Measured" },
  { key: "sdk", label: "SDK browser budget", value: "7.2 KB gzip", detail: "15.3 KB budget · safe runtime stays dependency-free", tone: "green" as const, status: "Under budget" },
  { key: "regression", label: "Seeded regression catch", value: "Buy button blocked", detail: "The hidden checkout action fails verification before release", tone: "green" as const, status: "Blocked safely" },
  { key: "quality", label: "Automated quality", value: "52 tests passed", detail: "Core, SDK, extension, verifier, AI, API, and design contracts", tone: "green" as const, status: "Green" },
  { key: "lighthouse", label: "Lighthouse evidence", value: "Capture required", detail: "Run against the final dashboard and marketing routes after public surfaces land", tone: "amber" as const, status: "Not measured" },
];

export function EvidenceScreen({ data, onNavigate }: Readonly<{ data: DashboardData; onNavigate: (view: DashboardView) => void }>) {
  const copyBrief = () => { const brief = measured.map((item) => `${item.label}: ${item.value} — ${item.detail}`).join("\n"); void navigator.clipboard?.writeText(brief); toast.success("Evidence brief copied", { description: "Measured local evidence is ready for a launch review." }); };
  return <div className="pw-route-screen pw-evidence-screen">
    <div className="pw-dashboard-heading"><div><span className="pw-dashboard-kicker"><span className="pw-kicker-dot" /> SHIP / proof</span><h1 id="dashboard-page-title">Evidence</h1><p>PATCHWORK earns trust with measured proof: resolver safety, runtime budget, regression catches, and quality gates that explain exactly what is and is not verified.</p></div><div className="pw-dashboard-heading-actions"><Button size="sm" variant="secondary" leadingIcon={<Copy size={14} aria-hidden="true" />} onClick={copyBrief}>Copy evidence brief</Button><Button size="sm" leadingIcon={<ShieldCheck size={14} aria-hidden="true" />} onClick={() => onNavigate("verification")}>Open verification</Button></div></div>
    <Banner tone="green" title="Core release evidence is attached" description="Resolver, SDK, regression, and automated test evidence is recorded locally. Lighthouse remains explicitly amber until the final public surfaces are in place." />
    <div className="pw-evidence-top"><Card eyebrow="Release confidence" title="Evidence health"><div className="pw-evidence-score"><ProgressRing value={92} label="ready" tone="green" /><StatusExplanation tone="green" title="Safe to review" description="The operator can inspect every green claim and see the amber gap before deciding whether to ship." /></div><ProgressBar value={92} label="Measured gate coverage" /></Card><Card eyebrow="PatchPilot summary" title="What the evidence says"><div className="pw-evidence-narrative"><Sparkles size={18} aria-hidden="true" /><p>The patch targets one existing price label, has an inverse operation, and is blocked from public traffic if the hidden checkout button disappears.</p></div><DataList items={[{ label: "Current site", value: data.site.name }, { label: "Candidate", value: data.site.releaseVersion }, { label: "Risk posture", value: "Amber until Lighthouse" }]} /></Card></div>
    <Card eyebrow="Measured gates" title="Proof, not promises" action={<Badge tone="violet">Local snapshot</Badge>}><Table caption="PATCHWORK measured release evidence" columns={[{ key: "label", label: "Gate", sortable: true }, { key: "value", label: "Observed value" }, { key: "detail", label: "Plain-English evidence" }, { key: "status", label: "Status" }]} rows={measured.map((item) => ({ label: <span className="pw-evidence-label"><span className={`pw-evidence-icon pw-evidence-icon-${item.tone}`}><BarChart3 size={13} aria-hidden="true" /></span><strong>{item.label}</strong></span>, value: <strong>{item.value}</strong>, detail: item.detail, status: <StatusDot tone={item.tone} label={item.status} /> }))} /></Card>
    <div className="pw-evidence-callout"><Gauge size={17} aria-hidden="true" /><div><strong>One honest gap remains.</strong><p>Lighthouse scores are intentionally not invented. The final capture belongs after the marketing surface and dashboard routes are complete.</p></div><CheckCircle2 size={17} aria-hidden="true" /></div>
    <SeamDivider label="EVIDENCE → SHIP · MEASURED STATES STAY LEGIBLE" />
  </div>;
}
