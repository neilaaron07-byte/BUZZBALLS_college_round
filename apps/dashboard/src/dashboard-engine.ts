import type {
  DashboardAction,
  DashboardData,
  DashboardFinding,
  DashboardPatch,
  DashboardRelease,
  DashboardStage,
  DashboardTone,
  DashboardView,
  WorkspaceReadModel,
} from "./dashboard-types";

export type FindingFilter = "all" | "critical" | "open" | "reviewed";
export type PatchFilter = "all" | "verified" | "needs-review" | "blocked";
export type ActivityFilter = "all" | "audit" | "finding" | "health" | "review" | "scan";
export type RolloutIntent = "pause" | "resume" | "promote" | "rollback" | "kill-switch";

export type DashboardQuery = {
  view: DashboardView;
  query: string;
  finding: FindingFilter;
  activity: ActivityFilter;
};

export type WorkspaceMetrics = {
  findingCount: number;
  criticalFindingCount: number;
  verifiedPatchCount: number;
  openConflictCount: number;
  reviewCount: number;
  canaryPercent: number;
  healthScore: number;
  readiness: "ready" | "review" | "blocked";
};

export type PolicyCheck = {
  id: string;
  label: string;
  tone: DashboardTone;
  status: "passed" | "review" | "blocked";
  detail: string;
  href: DashboardView;
};

export type RolloutState = {
  canaryPercent: number;
  paused: boolean;
  killSwitchEnabled: boolean;
  previousHealthyVersion: string | null;
};

export type RolloutDecision = {
  allowed: boolean;
  tone: DashboardTone;
  title: string;
  detail: string;
  nextAction: RolloutIntent | null;
};

const stageOrder: readonly DashboardStage["stage"][] = ["scan", "fix", "ship"];
const viewNames: readonly DashboardView[] = [
  "overview",
  "scan",
  "patches",
  "conflicts",
  "verification",
  "releases",
  "incidents",
  "audit",
  "reviews",
  "collaborators",
  "evidence",
  "install",
  "settings",
];

export function emptyDashboardQuery(): DashboardQuery {
  return { view: "overview", query: "", finding: "all", activity: "all" };
}

export function parseDashboardQuery(search: string): DashboardQuery {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  const view = params.get("view");
  const finding = params.get("finding");
  const activity = params.get("activity");
  return {
    view: view && viewNames.includes(view as DashboardView) ? view as DashboardView : "overview",
    query: params.get("q")?.trim() ?? "",
    finding: finding === "critical" || finding === "open" || finding === "reviewed" ? finding : "all",
    activity: activity === "audit" || activity === "finding" || activity === "health" || activity === "review" || activity === "scan" ? activity : "all",
  };
}

export function serializeDashboardQuery(query: DashboardQuery): string {
  const params = new URLSearchParams();
  if (query.view !== "overview") params.set("view", query.view);
  if (query.query) params.set("q", query.query);
  if (query.finding !== "all") params.set("finding", query.finding);
  if (query.activity !== "all") params.set("activity", query.activity);
  const value = params.toString();
  return value ? `?${value}` : "";
}

export function stageIndex(stage: DashboardStage["stage"]): number {
  return stageOrder.indexOf(stage);
}

export function stageLabel(stage: DashboardStage["stage"]): string {
  return stage.toUpperCase();
}

export function stageTone(stage: DashboardStage): DashboardTone {
  return stage.tone;
}

export function stageProgress(stage: DashboardStage): number {
  const count = Object.values(stage.counts).reduce((total, value) => total + value, 0);
  return Math.min(100, Math.max(stage.score, stage.score - Math.min(count * 3, 20)));
}

export function scoreLabel(score: number): string {
  if (score >= 95) return "Excellent";
  if (score >= 80) return "Strong";
  if (score >= 60) return "Review";
  return "Blocked";
}

export function toneForScore(score: number): DashboardTone {
  return score >= 80 ? "green" : score >= 60 ? "amber" : "red";
}

export function findingTone(finding: DashboardFinding): DashboardTone {
  if (finding.severity === "critical" || finding.severity === "high") return "red";
  if (finding.severity === "medium") return "amber";
  return "green";
}

export function findingSeverityRank(finding: DashboardFinding): number {
  const severity = { critical: 4, high: 3, medium: 2, low: 1 } as const;
  return severity[finding.severity];
}

export function sortFindings(findings: readonly DashboardFinding[]): DashboardFinding[] {
  return [...findings].sort((left, right) => findingSeverityRank(right) - findingSeverityRank(left) || right.confidence - left.confidence || left.id.localeCompare(right.id));
}

export function filterFindings(findings: readonly DashboardFinding[], filter: FindingFilter, reviewed: ReadonlySet<string>): DashboardFinding[] {
  const ordered = sortFindings(findings);
  if (filter === "critical") return ordered.filter((finding) => finding.severity === "critical" || finding.severity === "high");
  if (filter === "open") return ordered.filter((finding) => !reviewed.has(finding.id));
  if (filter === "reviewed") return ordered.filter((finding) => reviewed.has(finding.id));
  return ordered;
}

export function searchFindings(findings: readonly DashboardFinding[], query: string): DashboardFinding[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return [...findings];
  return findings.filter((finding) => [finding.id, finding.summary, finding.explanation].join(" ").toLowerCase().includes(normalized));
}

export function patchTone(patch: DashboardPatch): DashboardTone {
  if (["verified", "approved", "canary-ready"].includes(patch.status)) return "green";
  if (["rejected", "blocked", "rolled_back"].includes(patch.status)) return "red";
  return "amber";
}

export function patchFilterLabel(filter: PatchFilter): string {
  return filter === "all" ? "All patches" : filter === "verified" ? "Verified" : filter === "needs-review" ? "Needs review" : "Blocked";
}

export function filterPatches(patches: readonly DashboardPatch[], filter: PatchFilter): DashboardPatch[] {
  if (filter === "all") return [...patches];
  if (filter === "verified") return patches.filter((patch) => patch.status === "verified" || patch.status === "approved");
  if (filter === "blocked") return patches.filter((patch) => patch.status === "blocked" || patch.status === "rejected" || patch.status === "rolled_back");
  return patches.filter((patch) => !["verified", "approved", "blocked", "rejected", "rolled_back"].includes(patch.status));
}

export function patchSearchText(patch: DashboardPatch): string {
  return [patch.id, patch.title, patch.description, patch.status, ...patch.tags, patch.author.name].join(" ").toLowerCase();
}

export function searchPatches(patches: readonly DashboardPatch[], query: string): DashboardPatch[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return [...patches];
  return patches.filter((patch) => patchSearchText(patch).includes(normalized));
}

export function activityTone(type: string, severity: string): DashboardTone {
  if (severity === "critical") return "red";
  if (severity === "warning" || type === "finding") return "amber";
  if (type === "health") return "green";
  return "green";
}

export function activityTypeLabel(type: string): string {
  return type === "audit" ? "Audit" : type === "finding" ? "Finding" : type === "health" ? "Health" : type === "review" ? "Review" : type === "scan" ? "Scan" : "Activity";
}

export function filterActivities(data: DashboardData, filter: ActivityFilter, query = "") {
  const normalized = query.trim().toLowerCase();
  return data.workspace.recentActivity.filter((item) => {
    const matchesType = filter === "all" || item.type === filter;
    const matchesQuery = !normalized || [item.id, item.title, item.detail, item.subjectId].join(" ").toLowerCase().includes(normalized);
    return matchesType && matchesQuery;
  }).sort((left, right) => right.timestamp.localeCompare(left.timestamp));
}

export function workspaceMetrics(workspace: WorkspaceReadModel): WorkspaceMetrics {
  const release = workspace.release;
  const findingCount = workspace.findings.length;
  const criticalFindingCount = workspace.findings.filter((finding) => finding.severity === "critical" || finding.severity === "high").length;
  const verifiedPatchCount = workspace.patches.filter((patch) => patch.status === "verified" || patch.status === "approved").length;
  const openConflictCount = workspace.stages.fix.counts.conflicts ?? 0;
  const reviewCount = workspace.actions.filter((action) => action.tone === "amber").length;
  const canaryPercent = release?.rollout?.canaryPercent ?? 0;
  const healthScore = Math.round((workspace.stages.scan.score + workspace.stages.fix.score + workspace.stages.ship.score) / 3);
  const readiness = criticalFindingCount > 0 || release?.rollout?.killSwitch.enabled ? "blocked" : findingCount > 0 || openConflictCount > 0 || reviewCount > 0 ? "review" : "ready";
  return { findingCount, criticalFindingCount, verifiedPatchCount, openConflictCount, reviewCount, canaryPercent, healthScore, readiness };
}

export function readinessLabel(readiness: WorkspaceMetrics["readiness"]): string {
  return readiness === "ready" ? "Ready to ship" : readiness === "review" ? "Review before shipping" : "Blocked from shipping";
}

export function nextBestAction(actions: readonly DashboardAction[]): DashboardAction | null {
  return [...actions].sort((left, right) => right.priority - left.priority || left.id.localeCompare(right.id))[0] ?? null;
}

export function policyChecks(workspace: WorkspaceReadModel): PolicyCheck[] {
  const metrics = workspaceMetrics(workspace);
  const release = workspace.release;
  return [
    { id: "verification", label: "Browser verification", tone: workspace.stages.ship.tone === "green" ? "green" : "amber", status: workspace.stages.ship.tone === "green" ? "passed" : "review", detail: "Interaction, visual, accessibility, and console evidence are attached.", href: "verification" },
    { id: "resolver", label: "Target resolution", tone: workspace.findings.every((finding) => finding.confidence >= .9) ? "green" : "red", status: workspace.findings.every((finding) => finding.confidence >= .9) ? "passed" : "blocked", detail: `${workspace.findings.length || "No"} finding${workspace.findings.length === 1 ? "" : "s"} with explainable confidence evidence.`, href: "scan" },
    { id: "review", label: "Human review", tone: metrics.openConflictCount > 0 ? "amber" : "green", status: metrics.openConflictCount > 0 ? "review" : "passed", detail: metrics.openConflictCount > 0 ? `${metrics.openConflictCount} conflict needs an explicit decision.` : "Required reviewers have approved the candidate.", href: "reviews" },
    { id: "rollback", label: "Rollback manifest", tone: release?.rolledBackAt ? "amber" : "green", status: release?.rolledBackAt ? "review" : "passed", detail: release?.rolledBackAt ? "Previous healthy version is active while this release is investigated." : "A previous healthy manifest is signed and available.", href: "releases" },
  ];
}

export function rolloutState(release: DashboardRelease | null): RolloutState {
  return { canaryPercent: release?.rollout?.canaryPercent ?? 0, paused: release?.rollout?.paused ?? false, killSwitchEnabled: release?.rollout?.killSwitch.enabled ?? false, previousHealthyVersion: release?.rolledBackAt ? release.version : release ? `previous-${release.version}` : null };
}

export function clampCanary(value: number): number {
  return Math.min(100, Math.max(0, Math.round(value / 25) * 25));
}

export function rolloutDecision(state: RolloutState, intent: RolloutIntent, metrics: WorkspaceMetrics): RolloutDecision {
  if (intent === "kill-switch") return { allowed: true, tone: "red", title: state.killSwitchEnabled ? "Kill switch is already on" : "Kill switch will stop public traffic", detail: "The current release can be paused immediately while the last healthy manifest remains available.", nextAction: state.killSwitchEnabled ? "resume" : null };
  if (intent === "rollback") return { allowed: Boolean(state.previousHealthyVersion), tone: state.previousHealthyVersion ? "amber" : "red", title: state.previousHealthyVersion ? "Rollback is available" : "No previous healthy manifest", detail: state.previousHealthyVersion ? "The previous signed manifest can restore the public site in one step." : "PATCHWORK cannot roll back without a verified prior release.", nextAction: state.previousHealthyVersion ? null : "kill-switch" };
  if (intent === "promote") {
    const allowed = !state.killSwitchEnabled && !state.paused && metrics.readiness === "ready" && metrics.canaryPercent >= 75;
    return { allowed, tone: allowed ? "green" : "amber", title: allowed ? "Promotion is safe to review" : "Promotion needs another gate", detail: allowed ? "Health, verification, and review evidence are aligned for full rollout." : "Keep traffic bounded until the remaining finding, conflict, or pause state is resolved.", nextAction: allowed ? null : metrics.openConflictCount > 0 ? "pause" : "resume" };
  }
  if (intent === "pause") return { allowed: !state.killSwitchEnabled && !state.paused, tone: "amber", title: state.paused ? "Rollout is already paused" : "Pause keeps the blast radius bounded", detail: "No visitor traffic changes while the operator reviews health and evidence.", nextAction: state.paused ? "resume" : null };
  return { allowed: state.paused && !state.killSwitchEnabled, tone: "green", title: state.paused ? "Resume after review" : "Rollout is live", detail: "Resume only after the release owner has acknowledged the visible policy signals.", nextAction: state.paused ? null : "pause" };
}

export function applyRolloutIntent(state: RolloutState, intent: RolloutIntent, metrics: WorkspaceMetrics): RolloutState {
  const decision = rolloutDecision(state, intent, metrics);
  if (!decision.allowed) return state;
  if (intent === "pause") return { ...state, paused: true };
  if (intent === "resume") return { ...state, paused: false };
  if (intent === "promote") return { ...state, canaryPercent: 100, paused: false };
  if (intent === "kill-switch") return { ...state, killSwitchEnabled: true, paused: true };
  return { ...state, canaryPercent: 0, paused: true };
}

export function releaseStatusTone(release: DashboardRelease | null): DashboardTone {
  if (!release || release.status === "rolled_back") return "red";
  if (release.rollout?.killSwitch.enabled || release.rollout?.paused || (release.rollout?.canaryPercent ?? 0) < 100) return "amber";
  return "green";
}

export function releaseStatusLabel(release: DashboardRelease | null): string {
  const tone = releaseStatusTone(release);
  return tone === "green" ? "Healthy" : tone === "amber" ? "Review" : "Blocked";
}

export function confidenceLabel(confidence: number): string {
  return confidence >= .95 ? "Very high" : confidence >= .8 ? "High" : confidence >= .6 ? "Needs review" : "Low";
}

export function blastRadiusLabel(finding: DashboardFinding): string {
  const { elementCount, pageCount } = finding.blastRadius;
  if (elementCount <= 1 && pageCount <= 1) return "Contained";
  if (pageCount <= 3) return "Bounded";
  return "Wide";
}

export function evidenceNarrative(finding: DashboardFinding): string {
  return `${confidenceLabel(finding.confidence)} confidence · ${blastRadiusLabel(finding)} blast radius · ${finding.blastRadius.explanation}`;
}

export function patchNarrative(patch: DashboardPatch): string {
  const status = patch.status === "verified" || patch.status === "approved" ? "verified and reversible" : patch.status === "blocked" ? "blocked pending evidence" : "awaiting a review decision";
  return `${patch.title} is ${status}. ${patch.operationCount} operation${patch.operationCount === 1 ? "" : "s"} · revision ${patch.revision} · owned by ${patch.author.name}.`;
}

export function releaseNarrative(release: DashboardRelease | null, metrics: WorkspaceMetrics): string {
  if (!release) return "No production release is connected. Create a signed candidate after verification.";
  if (release.status === "rolled_back") return `Release ${release.version} is rolled back. Restore the last healthy manifest only after reviewing the incident evidence.`;
  if (metrics.readiness === "blocked") return `Release ${release.version} is blocked. Keep the current traffic boundary and resolve the red policy signal.`;
  if (metrics.readiness === "review") return `Release ${release.version} is live at ${metrics.canaryPercent}% canary. Review the amber signals before promotion.`;
  return `Release ${release.version} is healthy and ready for the next rollout step.`;
}

export function dashboardCsv(rows: readonly Record<string, string | number | boolean | null>[]): string {
  if (!rows.length) return "";
  const columns = Object.keys(rows[0]!);
  const escape = (value: string | number | boolean | null) => `"${String(value ?? "").replaceAll('"', '""')}"`;
  return [columns.join(","), ...rows.map((row) => columns.map((column) => escape(row[column] ?? null)).join(","))].join("\n");
}

export function workspaceExport(data: DashboardData): string {
  return dashboardCsv(data.workspace.recentActivity.map((activity) => ({ timestamp: activity.timestamp, type: activity.type, title: activity.title, detail: activity.detail, subject: activity.subjectId })));
}

export function viewFromHref(href: string): DashboardView {
  const value = href.split("?")[0]?.split("/").filter(Boolean).at(-1);
  return value && viewNames.includes(value as DashboardView) ? value as DashboardView : "overview";
}

export function compactCount(value: number, noun: string): string {
  return `${value} ${noun}${value === 1 ? "" : "s"}`;
}

export function formatAge(timestamp: string, now = "2026-10-10T08:00:00.000Z"): string {
  const minutes = Math.max(0, Math.round((Date.parse(now) - Date.parse(timestamp)) / 60_000));
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  return `${hours}h ago`;
}
