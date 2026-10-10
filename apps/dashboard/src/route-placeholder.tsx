"use client";

import { ArrowRight, CheckCircle2, FileClock, Layers3, Rocket, ScanSearch, ShieldAlert, Users } from "lucide-react";
import { Button } from "./ui/button";
import { Card } from "./ui/data";
import { Badge, StatusDot } from "./ui/navigation";
import { EmptyState } from "./ui/feedback";
import { SeamDivider } from "./ui/seams";
import type { DashboardData, DashboardView } from "./dashboard-types";
import { routeLabel } from "./routes";

const routeCopy: Record<DashboardView, { eyebrow: string; title: string; description: string; icon: typeof ScanSearch; next: DashboardView; nextLabel: string }> = {
  overview: { eyebrow: "Workspace", title: "Overview", description: "The operator summary belongs here.", icon: ScanSearch, next: "scan", nextLabel: "Review scan" },
  scan: { eyebrow: "SCAN / evidence", title: "Scan findings", description: "Review every detector finding with its measured evidence, confidence, and blast radius before you create a patch.", icon: ScanSearch, next: "patches", nextLabel: "Open patches" },
  patches: { eyebrow: "FIX / safe change", title: "Patches", description: "Inspect independently managed changes, reviewers, conflicts, and isolated previews before they become a release.", icon: Layers3, next: "releases", nextLabel: "Review releases" },
  conflicts: { eyebrow: "FIX / merge safety", title: "Conflicts", description: "Make an explicit decision when two independently managed patches touch the same target.", icon: Layers3, next: "patches", nextLabel: "Back to patches" },
  releases: { eyebrow: "SHIP / release control", title: "Releases", description: "Promote a signed manifest one gate at a time. The canary, policy, and health evidence stay together.", icon: Rocket, next: "incidents", nextLabel: "Open health" },
  incidents: { eyebrow: "SHIP / health", title: "Incidents", description: "See the live signal that would pause or roll back a release, with a clear undo path when the boundary is crossed.", icon: ShieldAlert, next: "audit", nextLabel: "Open audit" },
  reviews: { eyebrow: "FIX / people", title: "Review inbox", description: "Give every reviewer a small, legible decision: approve, request changes, or keep the patch out of production.", icon: Users, next: "patches", nextLabel: "Back to patches" },
  audit: { eyebrow: "SHIP / proof", title: "Audit trail", description: "Follow the hash-chained evidence from scan to patch to release. Exportable history is part of the release, not an afterthought.", icon: FileClock, next: "overview", nextLabel: "Back to overview" },
};

export function RoutePlaceholder({ data, view, onNavigate }: Readonly<{ data: DashboardData; view: DashboardView; onNavigate: (view: DashboardView) => void }>) {
  const copy = routeCopy[view];
  const Icon = copy.icon;
  const stage = view === "scan" ? data.workspace.stages.scan : view === "patches" ? data.workspace.stages.fix : view === "releases" || view === "incidents" ? data.workspace.stages.ship : null;
  if (view === "overview") return null;
  return <div className="pw-route-screen"><div className="pw-dashboard-heading"><div><span className="pw-dashboard-kicker"><span className="pw-kicker-dot" /> {copy.eyebrow}</span><h1 id="dashboard-page-title">{copy.title}</h1><p>{copy.description}</p></div><Button size="sm" variant="secondary" leadingIcon={<ArrowRight size={14} aria-hidden="true" />} onClick={() => onNavigate(copy.next)}>{copy.nextLabel}</Button></div><div className="pw-route-hero"><span className="pw-route-hero-icon"><Icon size={20} aria-hidden="true" /></span><div><Badge tone={stage?.tone ?? "violet"}>{stage ? `${stage.score}% ${stage.tone}` : "Evidence ready"}</Badge><h2>{stage?.headline ?? `The ${routeLabel(view).toLowerCase()} surface is connected.`}</h2><p>{stage?.explanation ?? "This screen is backed by the same deterministic workspace read model. Its detailed controls are being added as the operator flow is completed."}</p></div><StatusDot tone={stage?.tone ?? "green"} label={stage ? `${stage.label} status` : "Connected"} /></div><div className="pw-route-grid"><Card eyebrow="Current evidence" title={data.site.name}><div className="pw-route-stat"><strong>{stage ? Object.values(stage.counts).find((value) => value > 0) ?? 0 : data.workspace.recentActivity.length}</strong><span>{stage ? `${stage.label} signal${Object.values(stage.counts).find((value) => value > 0) === 1 ? "" : "s"} in this workspace` : "recent events in the release history"}</span></div></Card><Card eyebrow="Decision" title="Keep the seam visible"><div className="pw-route-decision"><CheckCircle2 size={17} aria-hidden="true" /><p>{stage?.tone === "red" ? "Resolve the red signal before PATCHWORK offers a ship action." : stage?.tone === "amber" ? "Review the amber evidence before increasing the public blast radius." : "The evidence is green. Continue through the next gate when ready."}</p></div></Card></div><EmptyState title={`Detailed ${routeLabel(view).toLowerCase()} controls are next`} description="The route is wired to the seeded incident and the API read model. Use the next-step action to keep moving through the safe workflow." action={{ label: copy.nextLabel, onClick: () => onNavigate(copy.next) }} /><SeamDivider label="PATCHWORK KEEPS THE CHANGE REVERSIBLE" /></div>;
}
