import type { Release } from "../../../packages/core/src/index";
import { buildTimeline, type TimelineEvent } from "./activity-timeline";
import { buildCollaborationReport, type CollaborationReport } from "./collaboration-readiness";
import { buildReleaseReadiness, type ReleaseReadiness } from "./release-readiness";
import { publicSite, toCsv } from "./normalizers";
import { buildWorkspaceReadModel, type StatusTone, type WorkspaceReadModel } from "./workspace-read-model";
import type { ApiState } from "./types";

export interface OperatorMetric {
  id: string;
  label: string;
  value: string | number;
  tone: StatusTone;
  explanation: string;
}

export interface OperatorBlocker {
  id: string;
  source: "scan" | "fix" | "ship" | "team";
  tone: StatusTone;
  label: string;
  explanation: string;
  href: string;
}

export interface OperatorStep {
  order: number;
  id: string;
  label: string;
  status: "complete" | "current" | "next" | "held";
  explanation: string;
  href: string;
}

export interface OperatorBrief {
  site: ReturnType<typeof publicSite>;
  generatedAt: string;
  tone: StatusTone;
  headline: string;
  decision: "ship" | "review" | "hold" | "rollback";
  decisionExplanation: string;
  metrics: readonly OperatorMetric[];
  blockers: readonly OperatorBlocker[];
  steps: readonly OperatorStep[];
  evidenceLinks: readonly { label: string; href: string; explanation: string }[];
  handoff: string;
  workspace: WorkspaceReadModel;
  readiness: ReleaseReadiness | null;
  collaboration: CollaborationReport;
  timeline: readonly TimelineEvent[];
}

function releaseForSite(state: ApiState, siteId: string, releaseId?: string): Release | null {
  if (releaseId) return state.releases.find((release) => release.id === releaseId) ?? null;
  return [...state.releases.filter((release) => release.siteId === siteId && release.environment === "production")].sort((left, right) => right.createdAt.localeCompare(left.createdAt))[0] ?? null;
}

function toneWeight(tone: StatusTone): number {
  return tone === "red" ? 3 : tone === "amber" ? 2 : 1;
}

function maxTone(...tones: readonly StatusTone[]): StatusTone {
  return [...tones].sort((left, right) => toneWeight(right) - toneWeight(left))[0] ?? "green";
}

function decisionFor(tone: StatusTone, readiness: ReleaseReadiness | null, workspace: WorkspaceReadModel): OperatorBrief["decision"] {
  if (workspace.stages.ship.tone === "red" && readiness?.checks.some((check) => check.id === "runtime-health" && check.state === "blocked")) return "rollback";
  if (tone === "red") return "hold";
  if (tone === "amber") return "review";
  return "ship";
}

function headlineFor(decision: OperatorBrief["decision"], siteName: string): string {
  if (decision === "ship") return `${siteName} is ready for the next rollout step.`;
  if (decision === "review") return `${siteName} is safe to inspect, not safe to rush.`;
  if (decision === "rollback") return `${siteName} needs the last known-good release restored.`;
  return `${siteName} is protected until the open gates are resolved.`;
}

function explanationFor(decision: OperatorBrief["decision"], blockers: readonly OperatorBlocker[]): string {
  if (decision === "ship") return "All required release evidence is green and no operator action is blocking promotion.";
  if (decision === "rollback") return "A critical runtime signal is active. Use the rollback target shown below, then replay verification.";
  if (decision === "review") return `${blockers.length} review signal${blockers.length === 1 ? "" : "s"} needs a named owner before traffic changes.`;
  return `${blockers.length} blocker${blockers.length === 1 ? "" : "s"} stops promotion. PATCHWORK keeps the release protected until evidence is repaired.`;
}

function blockersFor(workspace: WorkspaceReadModel, readiness: ReleaseReadiness | null, collaboration: CollaborationReport): OperatorBlocker[] {
  const blockers: OperatorBlocker[] = [];
  for (const action of workspace.actions) {
    blockers.push({ id: `workspace_${action.id}`, source: action.stage, tone: action.tone, label: action.label, explanation: action.explanation, href: action.href });
  }
  for (const action of readiness?.actions ?? []) {
    blockers.push({ id: `readiness_${action.id}`, source: "ship", tone: action.tone, label: action.label, explanation: action.explanation, href: action.href });
  }
  if (collaboration.counts.blocked > 0) {
    blockers.push({ id: "team_blocked", source: "team", tone: "red", label: "Resolve blocked review work", explanation: collaboration.explanation, href: "/dashboard/reviews" });
  } else if (collaboration.counts.waiting > 0) {
    blockers.push({ id: "team_waiting", source: "team", tone: "amber", label: "Assign the next reviewer", explanation: collaboration.explanation, href: "/dashboard/reviews" });
  }
  return blockers.filter((blocker, index, all) => all.findIndex((candidate) => candidate.label === blocker.label) === index).slice(0, 8);
}

function metric(id: string, label: string, value: string | number, tone: StatusTone, explanation: string): OperatorMetric {
  return { id, label, value, tone, explanation };
}

function metricsFor(workspace: WorkspaceReadModel, readiness: ReleaseReadiness | null, collaboration: CollaborationReport): readonly OperatorMetric[] {
  return [
    metric("risk", "Workspace risk", workspace.risk.score, workspace.risk.tone, workspace.risk.explanation),
    metric("findings", "Open findings", workspace.stages.scan.counts.findings ?? 0, workspace.stages.scan.tone, workspace.stages.scan.headline),
    metric("conflicts", "Open conflicts", workspace.stages.fix.counts.conflicts ?? 0, workspace.stages.fix.tone, workspace.stages.fix.headline),
    metric("readiness", "Release readiness", readiness?.score ?? "—", readiness?.tone ?? "amber", readiness?.explanation ?? "No production release is connected."),
    metric("reviewers", "Waiting reviewers", collaboration.counts.waiting, collaboration.tone, collaboration.explanation),
    metric("canary", "Canary traffic", workspace.stages.ship.counts.canaryPercent ?? 0, workspace.stages.ship.tone, "Current production rollout percentage."),
  ];
}

function stepsFor(decision: OperatorBrief["decision"], workspace: WorkspaceReadModel, readiness: ReleaseReadiness | null): readonly OperatorStep[] {
  const scanStatus: OperatorStep["status"] = workspace.stages.scan.tone === "red" ? "current" : "complete";
  const fixStatus: OperatorStep["status"] = workspace.stages.fix.tone === "red" ? "current" : workspace.stages.fix.tone === "amber" ? "next" : "complete";
  const shipStatus: OperatorStep["status"] = decision === "rollback" || decision === "hold" ? "held" : decision === "review" ? "next" : "current";
  return [
    { order: 1, id: "scan", label: "Review scan evidence", status: scanStatus, explanation: workspace.stages.scan.explanation, href: workspace.stages.scan.href },
    { order: 2, id: "fix", label: "Confirm the patch and review", status: fixStatus, explanation: workspace.stages.fix.explanation, href: workspace.stages.fix.href },
    { order: 3, id: "verify", label: "Replay isolated verification", status: readiness?.verification?.report.status === "passed" ? "complete" : "next", explanation: readiness?.checks.find((check) => check.id === "browser-verification")?.explanation ?? "Verification evidence is required before shipping.", href: "/dashboard/verification" },
    { order: 4, id: "ship", label: decision === "rollback" ? "Restore the known-good release" : "Ship with canary controls", status: shipStatus, explanation: readiness?.explanation ?? "Release evidence will appear here after a production release is selected.", href: decision === "rollback" ? "/dashboard/incidents" : "/dashboard/releases" },
  ];
}

function evidenceFor(readiness: ReleaseReadiness | null): OperatorBrief["evidenceLinks"] {
  if (!readiness) return [{ label: "Release workspace", href: "/dashboard/releases", explanation: "Open release controls to connect a production release." }];
  return [
    { label: "Readiness checks", href: `/dashboard/releases/${readiness.release.id}/readiness`, explanation: `${readiness.checks.length} policy, verification, health, manifest, audit, and rollback checks.` },
    { label: "Verification report", href: "/dashboard/verification", explanation: readiness.verification?.report.summary ?? "No report attached." },
    { label: "Audit chain", href: "/dashboard/audit", explanation: readiness.audit.reason },
    { label: "Rollback target", href: "/dashboard/incidents", explanation: readiness.checks.find((check) => check.id === "rollback-target")?.explanation ?? "Rollback target is not recorded." },
  ];
}

function handoffFor(siteName: string, decision: OperatorBrief["decision"], blockers: readonly OperatorBlocker[], collaboration: CollaborationReport): string {
  const owner = collaboration.nextOwner?.name ?? "the on-call owner";
  if (decision === "ship") return `${siteName} is ready for promotion. ${owner} owns the next rollout check.`;
  if (decision === "rollback") return `${siteName} is in rollback posture. ${owner} should restore the known-good release and replay verification.`;
  return `${siteName} is in ${decision} posture. ${owner} owns the next decision; start with ${blockers[0]?.label ?? "the release evidence"}.`;
}

export async function buildOperatorBrief(state: ApiState, siteId: string, releaseId?: string, generatedAt = new Date().toISOString()): Promise<OperatorBrief | null> {
  const site = state.sites.find((candidate) => candidate.id === siteId);
  if (!site) return null;
  const workspace = buildWorkspaceReadModel(state, siteId, generatedAt);
  const release = releaseForSite(state, siteId, releaseId);
  const readiness = release ? await buildReleaseReadiness(state, release.id, new Date(generatedAt), generatedAt) : null;
  const collaboration = buildCollaborationReport(state, siteId, generatedAt);
  const blockers = blockersFor(workspace, readiness, collaboration);
  const tone = maxTone(workspace.risk.tone, readiness?.tone ?? "amber", collaboration.tone);
  const decision = decisionFor(tone, readiness, workspace);
  const timeline = buildTimeline(state, siteId, { limit: 8 }).items;
  return { site: publicSite(site), generatedAt, tone, headline: headlineFor(decision, site.name), decision, decisionExplanation: explanationFor(decision, blockers), metrics: metricsFor(workspace, readiness, collaboration), blockers, steps: stepsFor(decision, workspace, readiness), evidenceLinks: evidenceFor(readiness), handoff: handoffFor(site.name, decision, blockers, collaboration), workspace, readiness, collaboration, timeline };
}

export function operatorBriefNarrative(brief: OperatorBrief): string {
  return `${brief.headline} ${brief.decisionExplanation} ${brief.handoff}`;
}

export function operatorBriefCsvRows(brief: OperatorBrief): readonly (readonly (string | number | boolean | null)[])[] {
  return [
    ["section", "label", "value", "tone", "explanation"],
    ...brief.metrics.map((item) => ["metric", item.label, item.value, item.tone, item.explanation]),
    ...brief.blockers.map((item) => ["blocker", item.label, "", item.tone, item.explanation]),
    ...brief.steps.map((item) => ["step", item.label, item.status, item.status === "complete" ? "green" : item.status === "held" ? "red" : "amber", item.explanation]),
  ];
}

export function operatorBriefActivityCount(brief: OperatorBrief): number {
  return brief.timeline.length;
}

export function operatorBriefCsv(brief: OperatorBrief): string {
  return `${toCsv(operatorBriefCsvRows(brief))}\n`;
}
