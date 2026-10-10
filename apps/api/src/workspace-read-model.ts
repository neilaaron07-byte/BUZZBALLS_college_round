import type { Patch, Release, ScanFinding } from "../../../packages/core/src/index";
import { activityFromState, findingView, publicPatch, publicSite, releaseTimeline, type ActivityItem } from "./normalizers";
import { evaluateReleasePolicy, type ReleasePolicyResult } from "./policies";
import { notFound } from "./errors";
import type { ApiState, RolloutState } from "./types";

export type StatusTone = "green" | "amber" | "red";
export type WorkflowStage = "scan" | "fix" | "ship";

export interface StageStatus {
  stage: WorkflowStage;
  label: string;
  tone: StatusTone;
  score: number;
  headline: string;
  explanation: string;
  href: string;
  counts: Readonly<Record<string, number>>;
}

export interface WorkspaceAction {
  id: string;
  stage: WorkflowStage;
  tone: StatusTone;
  label: string;
  explanation: string;
  href: string;
  priority: number;
}

export interface WorkspaceRisk {
  tone: StatusTone;
  score: number;
  label: string;
  explanation: string;
  factors: readonly string[];
}

export interface WorkspaceReadModel {
  generatedAt: string;
  site: ReturnType<typeof publicSite>;
  stages: { scan: StageStatus; fix: StageStatus; ship: StageStatus };
  nextAction: WorkspaceAction;
  actions: readonly WorkspaceAction[];
  risk: WorkspaceRisk;
  release: ReturnType<typeof releaseTimeline>[number] | null;
  recentActivity: readonly ActivityItem[];
  findings: readonly ReturnType<typeof findingView>[];
  patches: readonly ReturnType<typeof publicPatch>[];
  policy: ReleasePolicyResult | null;
}

const emptyAction: WorkspaceAction = {
  id: "workspace_healthy",
  stage: "scan",
  tone: "green",
  label: "Run a fresh scan",
  explanation: "The workspace has no urgent blocker. Run a scan to keep the release evidence current.",
  href: "/dashboard/scan",
  priority: 10,
};

function toneForFinding(finding: ScanFinding): StatusTone {
  return finding.severity === "critical" || finding.severity === "high" ? "red" : finding.severity === "medium" ? "amber" : "green";
}

function latestByDate<T>(items: readonly T[], getDate: (item: T) => string): T | null {
  return [...items].sort((left, right) => getDate(right).localeCompare(getDate(left)))[0] ?? null;
}

function sitePatchIds(state: ApiState, siteId: string): ReadonlySet<string> {
  return new Set(state.patches.filter((patch) => patch.identity.siteId === siteId).map((patch) => patch.identity.id));
}

function siteFindingIds(state: ApiState, siteId: string): ReadonlySet<string> {
  return new Set(state.scanRuns.filter((scan) => scan.siteId === siteId).flatMap((scan) => scan.findingIds));
}

function stageScore(tone: StatusTone, total: number, blockers: number): number {
  if (tone === "red") return Math.max(10, 64 - blockers * 12);
  if (tone === "amber") return Math.max(70, 92 - Math.min(total, 11) * 2);
  return 100;
}

export function buildScanStage(state: ApiState, siteId: string): StageStatus {
  const scans = state.scanRuns.filter((scan) => scan.siteId === siteId);
  const findingIds = siteFindingIds(state, siteId);
  const findings = state.findings.filter((finding) => findingIds.has(finding.id));
  const latest = latestByDate(scans, (scan) => scan.finishedAt ?? scan.startedAt);
  const critical = findings.filter((finding) => toneForFinding(finding) === "red");
  const tone: StatusTone = critical.length > 0 ? "red" : findings.length > 0 ? "amber" : "green";
  const headline = critical.length > 0 ? `${critical.length} critical finding${critical.length === 1 ? "" : "s"} need attention` : findings.length > 0 ? `${findings.length} finding${findings.length === 1 ? "" : "s"} ready for review` : "No scanner findings are open";
  const explanation = latest ? `${latest.summary} PATCHWORK scanned ${latest.pageUrl} and recorded evidence for each detector.` : "No scan has been run for this site yet. Start with the page or flow that needs a fix.";
  return { stage: "scan", label: "SCAN", tone, score: stageScore(tone, findings.length, critical.length), headline, explanation, href: "/dashboard/scan", counts: { scans: scans.length, findings: findings.length, critical: critical.length } };
}

export function buildFixStage(state: ApiState, siteId: string): StageStatus {
  const patchIds = sitePatchIds(state, siteId);
  const patches = state.patches.filter((patch) => patchIds.has(patch.identity.id));
  const conflicts = state.conflicts.filter((conflict) => patchIds.has(conflict.patchId) && conflict.resolvedAt === null);
  const awaitingReview = patches.filter((patch) => patch.status === "draft" || patch.status === "review");
  const blocking = conflicts.filter((conflict) => conflict.severity === "blocking");
  const tone: StatusTone = blocking.length > 0 ? "red" : awaitingReview.length > 0 || conflicts.length > 0 ? "amber" : "green";
  const headline = blocking.length > 0 ? `${blocking.length} blocking conflict${blocking.length === 1 ? "" : "s"} stop shipping` : awaitingReview.length > 0 ? `${awaitingReview.length} patch${awaitingReview.length === 1 ? "" : "es"} need review` : "Patches are verified and ready";
  const explanation = blocking.length > 0 ? "Resolve the conflicting change before PATCHWORK can safely generate a release." : awaitingReview.length > 0 ? "Review the proposed operation and its target evidence before opening a preview." : "The current patch set has no open review blocker. Keep the target evidence attached to the release.";
  return { stage: "fix", label: "FIX", tone, score: stageScore(tone, patches.length, blocking.length), headline, explanation, href: "/dashboard/patches", counts: { patches: patches.length, awaitingReview: awaitingReview.length, conflicts: conflicts.length, blocking: blocking.length } };
}

function currentRelease(state: ApiState, siteId: string): Release | null {
  return latestByDate(state.releases.filter((release) => release.siteId === siteId && release.environment === "production"), (release) => release.createdAt);
}

function healthForRelease(state: ApiState, releaseId: string): { critical: number; degraded: number; latest: string | null } {
  const events = state.healthEvents.filter((event) => event.releaseId === releaseId);
  return { critical: events.filter((event) => event.status === "critical").length, degraded: events.filter((event) => event.status === "degraded").length, latest: latestByDate(events, (event) => event.observedAt)?.observedAt ?? null };
}

export function buildShipStage(state: ApiState, siteId: string): StageStatus & { release: ReturnType<typeof releaseTimeline>[number] | null; policy: ReleasePolicyResult | null } {
  const release = currentRelease(state, siteId);
  if (!release) return { stage: "ship", label: "SHIP", tone: "amber", score: 70, headline: "No production release is connected", explanation: "Connect a production environment before increasing rollout percentage.", href: "/dashboard/releases", counts: { releases: 0, healthCritical: 0, healthDegraded: 0, canaryPercent: 0 }, release: null, policy: null };
  const policy = evaluateReleasePolicy(state, release);
  const rollout = state.rollouts.find((candidate) => candidate.releaseId === release.id) ?? null;
  const health = healthForRelease(state, release.id);
  const tone: StatusTone = health.critical > 0 || policy.status === "blocked" ? "red" : health.degraded > 0 || policy.status === "warning" || rollout?.paused ? "amber" : "green";
  const headline = tone === "red" ? "Release needs intervention" : tone === "amber" ? "Release is safe but not clear to promote" : release.status === "live" ? "Production is healthy" : "Release is ready to ship";
  const explanation = health.critical > 0 ? `${health.critical} critical health signal${health.critical === 1 ? "" : "s"} crossed the release safety boundary.` : policy.nextAction;
  return { stage: "ship", label: "SHIP", tone, score: stageScore(tone, policy.checks.length + health.degraded, health.critical), headline, explanation, href: "/dashboard/releases", counts: { releases: 1, healthCritical: health.critical, healthDegraded: health.degraded, canaryPercent: rollout?.canaryPercent ?? 0 }, release: releaseTimeline([release], state.rollouts)[0] ?? null, policy };
}

function actionForScan(stage: StageStatus): WorkspaceAction | null {
  if (stage.tone === "red") return { id: "review-critical-finding", stage: "scan", tone: "red", label: "Review critical finding", explanation: stage.explanation, href: "/dashboard/scan", priority: 100 };
  if (stage.tone === "amber") return { id: "review-scan-findings", stage: "scan", tone: "amber", label: "Review scan findings", explanation: stage.explanation, href: "/dashboard/scan", priority: 80 };
  return null;
}

function actionForFix(stage: StageStatus): WorkspaceAction | null {
  if ((stage.counts.blocking ?? 0) > 0) return { id: "resolve-patch-conflict", stage: "fix", tone: "red", label: "Resolve patch conflict", explanation: stage.explanation, href: "/dashboard/conflicts", priority: 110 };
  if ((stage.counts.awaitingReview ?? 0) > 0) return { id: "review-patch", stage: "fix", tone: "amber", label: "Review proposed patch", explanation: stage.explanation, href: "/dashboard/patches", priority: 90 };
  return null;
}

function actionForShip(stage: StageStatus): WorkspaceAction | null {
  if (stage.tone === "red") return { id: "protect-release", stage: "ship", tone: "red", label: "Protect the release", explanation: stage.explanation, href: "/dashboard/incidents", priority: 120 };
  if (stage.tone === "amber") return { id: "review-release", stage: "ship", tone: "amber", label: "Review release risk", explanation: stage.explanation, href: "/dashboard/releases", priority: 70 };
  return null;
}

export function workspaceActions(stages: { scan: StageStatus; fix: StageStatus; ship: StageStatus }): readonly WorkspaceAction[] {
  return [actionForScan(stages.scan), actionForFix(stages.fix), actionForShip(stages.ship)].filter((action): action is WorkspaceAction => action !== null).sort((left, right) => right.priority - left.priority);
}

function workspaceRisk(stages: { scan: StageStatus; fix: StageStatus; ship: StageStatus }, actions: readonly WorkspaceAction[]): WorkspaceRisk {
  const redStages = Object.values(stages).filter((stage) => stage.tone === "red").length;
  const amberStages = Object.values(stages).filter((stage) => stage.tone === "amber").length;
  const score = Math.max(0, 100 - redStages * 34 - amberStages * 13);
  const factors = Object.values(stages).filter((stage) => stage.tone !== "green").map((stage) => `${stage.label}: ${stage.headline}`);
  if (redStages > 0) return { tone: "red", score, label: "Action required", explanation: `${actions.length} workflow action${actions.length === 1 ? "" : "s"} must be resolved before a confident ship.`, factors };
  if (amberStages > 0) return { tone: "amber", score, label: "Review before shipping", explanation: "The workflow is usable, but at least one stage needs a human decision before promotion.", factors };
  return { tone: "green", score: 100, label: "Healthy workspace", explanation: "SCAN, FIX, and SHIP have no open safety blockers.", factors: [] };
}

export function buildWorkspaceReadModel(state: ApiState, siteId: string, generatedAt = new Date().toISOString()): WorkspaceReadModel {
  const site = state.sites.find((candidate) => candidate.id === siteId);
  if (!site) throw notFound("Site", siteId);
  const stages = { scan: buildScanStage(state, siteId), fix: buildFixStage(state, siteId), ship: buildShipStage(state, siteId) };
  const actions = workspaceActions(stages);
  const risk = workspaceRisk(stages, actions);
  const nextAction = actions[0] ?? emptyAction;
  const patchIds = sitePatchIds(state, siteId);
  const findingIds = siteFindingIds(state, siteId);
  const current = currentRelease(state, siteId);
  return { generatedAt, site: publicSite(site), stages, nextAction, actions, risk, release: current ? releaseTimeline([current], state.rollouts)[0] ?? null : null, recentActivity: activityFromState(state, siteId).slice(0, 12), findings: state.findings.filter((finding) => findingIds.has(finding.id)).map(findingView), patches: state.patches.filter((patch) => patchIds.has(patch.identity.id)).map((patch) => publicPatch(patch, state.collaborators)), policy: stages.ship.policy };
}

export function workspaceStatusTone(value: string): StatusTone {
  if (value === "critical" || value === "failed" || value === "blocked" || value === "red") return "red";
  if (value === "degraded" || value === "warning" || value === "amber") return "amber";
  return "green";
}

export function explainStage(stage: StageStatus): string {
  return `${stage.label} is ${stage.tone}: ${stage.headline}. ${stage.explanation}`;
}

export function stageOrder(): readonly WorkflowStage[] {
  return ["scan", "fix", "ship"];
}

export function summarizeStages(stages: { scan: StageStatus; fix: StageStatus; ship: StageStatus }): string {
  return stageOrder().map((stage) => explainStage(stages[stage])).join(" ");
}

export function rolloutHealth(state: ApiState, rollout: RolloutState | null): StatusTone {
  if (!rollout) return "amber";
  if (rollout.killSwitch.enabled || rollout.paused) return "red";
  const health = healthForRelease(state, rollout.releaseId);
  return health.critical > 0 ? "red" : health.degraded > 0 ? "amber" : "green";
}

export function patchStatusTone(patch: Patch): StatusTone {
  return patch.status === "rejected" || patch.status === "rolled_back" ? "red" : patch.status === "draft" || patch.status === "review" || patch.status === "scheduled" ? "amber" : "green";
}
