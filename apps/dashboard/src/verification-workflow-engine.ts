import type { DashboardData, DashboardTone } from "./dashboard-types";

export type VerificationCheckId = "interaction" | "visual" | "a11y" | "console" | "network";
export type VerificationCheckState = "passed" | "warning" | "failed" | "skipped";
export type VerificationRunState = "queued" | "running" | "passed" | "failed" | "expired";

export type VerificationCheckRecord = {
  id: VerificationCheckId;
  category: "browser" | "visual" | "accessibility" | "runtime";
  label: string;
  state: VerificationCheckState;
  tone: DashboardTone;
  observed: string;
  expected: string;
  durationMs: number;
  evidence: readonly string[];
  detail: string;
  route: string;
};

export type VerificationRun = {
  id: string;
  state: VerificationRunState;
  candidateVersion: string;
  baselineVersion: string;
  startedAt: string;
  finishedAt: string | null;
  replayCount: number;
  checks: readonly VerificationCheckRecord[];
  score: number;
  counts: { passed: number; warnings: number; failed: number; skipped: number };
  matrix: readonly { viewport: string; route: string; state: VerificationCheckState; checks: number }[];
  tone: DashboardTone;
  headline: string;
  explanation: string;
  nextAction: "replay" | "review" | "block" | "ship";
};

export type VerificationComparison = {
  improved: number;
  regressed: number;
  unchanged: number;
  changedChecks: readonly { id: VerificationCheckId; before: VerificationCheckState; after: VerificationCheckState }[];
  tone: DashboardTone;
  summary: string;
};

const runStart = "2026-10-10T07:39:00.000Z";
const runFinish = "2026-10-10T07:39:12.000Z";

const checkDefinitions: readonly Omit<VerificationCheckRecord, "state" | "tone">[] = [
  { id: "interaction", category: "browser", label: "Checkout interaction", observed: "12 / 12", expected: "12 / 12 browser paths", durationMs: 1220, evidence: ["Buy action visible", "Checkout action reachable", "Success path completed"], detail: "The Buy action remains visible and reachable in the browser matrix.", route: "/product/aurora-headphones" },
  { id: "visual", category: "visual", label: "Visual regression", observed: "1 bounded region", expected: "≤ 1 intended region", durationMs: 840, evidence: ["Price token changed", "No layout shift", "No hidden action"], detail: "Only the intended price token changed in the visual diff.", route: "/product/aurora-headphones" },
  { id: "a11y", category: "accessibility", label: "Accessibility delta", observed: "0 serious", expected: "0 serious or critical", durationMs: 610, evidence: ["Contrast 13.21:1", "Keyboard reachability passed", "Axe serious: 0"], detail: "The patched route adds no serious or critical accessibility violations.", route: "/product/aurora-headphones" },
  { id: "console", category: "runtime", label: "Console state", observed: "0 errors", expected: "0 errors", durationMs: 330, evidence: ["Page errors: 0", "Console errors: 0"], detail: "The full route capture completed without browser errors.", route: "/product/aurora-headphones" },
  { id: "network", category: "runtime", label: "Network state", observed: "0 failures", expected: "0 failed requests", durationMs: 290, evidence: ["External requests: 0", "Failed requests: 0"], detail: "The offline-safe fixture did not depend on a failed external request.", route: "/product/aurora-headphones" },
];

function stateTone(state: VerificationCheckState): DashboardTone {
  return state === "passed" ? "green" : state === "failed" ? "red" : "amber";
}

function scoreFor(checks: readonly VerificationCheckRecord[]): number {
  if (!checks.length) return 0;
  const total = checks.reduce((sum, check) => sum + (check.state === "passed" ? 100 : check.state === "warning" ? 70 : check.state === "skipped" ? 40 : 0), 0);
  return Math.round(total / checks.length);
}

function countsFor(checks: readonly VerificationCheckRecord[]): VerificationRun["counts"] {
  return { passed: checks.filter((check) => check.state === "passed").length, warnings: checks.filter((check) => check.state === "warning").length, failed: checks.filter((check) => check.state === "failed").length, skipped: checks.filter((check) => check.state === "skipped").length };
}

function runTone(counts: VerificationRun["counts"]): DashboardTone {
  return counts.failed ? "red" : counts.warnings || counts.skipped ? "amber" : "green";
}

function runHeadline(counts: VerificationRun["counts"]): string {
  if (counts.failed) return `${counts.failed} verification check${counts.failed === 1 ? "" : "s"} blocked release`;
  if (counts.warnings || counts.skipped) return `${counts.passed} checks passed; review the remaining evidence`;
  return `${counts.passed} browser checks passed`;
}

function runExplanation(counts: VerificationRun["counts"], version: string): string {
  if (counts.failed) return `Release ${version} stays blocked until the failed browser evidence is repaired and replayed.`;
  if (counts.warnings || counts.skipped) return `Release ${version} has enough evidence to review, but it is not safe to promote until amber checks are acknowledged.`;
  return `Release ${version} passed the interaction, visual, accessibility, console, and network checks in an isolated browser run.`;
}

function nextAction(counts: VerificationRun["counts"]): VerificationRun["nextAction"] {
  return counts.failed ? "block" : counts.warnings || counts.skipped ? "review" : "ship";
}

function matrixFor(checks: readonly VerificationCheckRecord[]): VerificationRun["matrix"] {
  const viewports = ["390px mobile", "1024px tablet", "1440px desktop"];
  return viewports.map((viewport) => ({ viewport, route: "/product/aurora-headphones", state: checks.some((check) => check.state === "failed") ? "failed" : checks.some((check) => check.state === "warning") ? "warning" : "passed", checks: checks.length }));
}

function makeChecks(overrides: Partial<Record<VerificationCheckId, VerificationCheckState>> = {}): VerificationCheckRecord[] {
  return checkDefinitions.map((definition) => { const state = overrides[definition.id] ?? "passed"; return { ...definition, state, tone: stateTone(state) }; });
}

export function buildVerificationRun(data: DashboardData, overrides: Partial<Record<VerificationCheckId, VerificationCheckState>> = {}): VerificationRun {
  const checks = makeChecks(overrides);
  const counts = countsFor(checks);
  return {
    id: `verify_${data.site.releaseVersion.replaceAll(".", "_")}_01`,
    state: counts.failed ? "failed" : "passed",
    candidateVersion: data.site.releaseVersion,
    baselineVersion: "2026.10.10.2",
    startedAt: runStart,
    finishedAt: runFinish,
    replayCount: 1,
    checks,
    score: scoreFor(checks),
    counts,
    matrix: matrixFor(checks),
    tone: runTone(counts),
    headline: runHeadline(counts),
    explanation: runExplanation(counts, data.site.releaseVersion),
    nextAction: nextAction(counts),
  };
}

export function replayVerificationRun(run: VerificationRun, overrides: Partial<Record<VerificationCheckId, VerificationCheckState>> = {}): VerificationRun {
  const checks = makeChecks(overrides);
  const counts = countsFor(checks);
  return { ...run, id: `${run.id.split("_").slice(0, -1).join("_")}_${String(run.replayCount + 1).padStart(2, "0")}`, state: counts.failed ? "failed" : "passed", startedAt: "2026-10-10T08:01:00.000Z", finishedAt: "2026-10-10T08:01:12.000Z", replayCount: run.replayCount + 1, checks, score: scoreFor(checks), counts, matrix: matrixFor(checks), tone: runTone(counts), headline: runHeadline(counts), explanation: runExplanation(counts, run.candidateVersion), nextAction: nextAction(counts) };
}

export function verificationCheckById(run: VerificationRun, id: VerificationCheckId): VerificationCheckRecord | null {
  return run.checks.find((check) => check.id === id) ?? null;
}

export function verificationStateLabel(state: VerificationCheckState): string {
  return state === "passed" ? "Passed" : state === "warning" ? "Review" : state === "failed" ? "Failed" : "Skipped";
}

export function verificationRunStateLabel(state: VerificationRunState): string {
  return state === "passed" ? "Verification passed" : state === "failed" ? "Verification failed" : state === "running" ? "Verification running" : state === "queued" ? "Verification queued" : "Verification expired";
}

export function verificationRunTone(state: VerificationRunState): DashboardTone {
  return state === "passed" ? "green" : state === "failed" || state === "expired" ? "red" : "amber";
}

export function verificationCheckTone(check: VerificationCheckRecord): DashboardTone {
  return check.tone;
}

export function verificationNarrative(run: VerificationRun): string {
  return run.explanation;
}

export function verificationProgress(run: VerificationRun): number {
  return Math.round((run.counts.passed + run.counts.warnings + run.counts.failed + run.counts.skipped) / Math.max(run.checks.length, 1) * 100);
}

export function verificationGateSummary(run: VerificationRun): readonly { label: string; value: string; tone: DashboardTone }[] {
  return [
    { label: "Passed", value: String(run.counts.passed), tone: "green" },
    { label: "Warnings", value: String(run.counts.warnings), tone: run.counts.warnings ? "amber" : "green" },
    { label: "Failed", value: String(run.counts.failed), tone: run.counts.failed ? "red" : "green" },
    { label: "Replay", value: `#${run.replayCount}`, tone: "green" },
  ];
}

export function compareVerificationRuns(previous: VerificationRun, current: VerificationRun): VerificationComparison {
  const changedChecks = current.checks.flatMap((check) => { const before = verificationCheckById(previous, check.id); return before && before.state !== check.state ? [{ id: check.id, before: before.state, after: check.state }] : []; });
  const improved = changedChecks.filter((change) => change.before !== "passed" && change.after === "passed").length;
  const regressed = changedChecks.filter((change) => change.before === "passed" && change.after !== "passed").length;
  const unchanged = current.checks.length - changedChecks.length;
  const tone: DashboardTone = regressed ? "red" : improved ? "green" : current.tone;
  const summary = regressed ? `${regressed} verification check${regressed === 1 ? "" : "s"} regressed and needs repair.` : improved ? `${improved} verification check${improved === 1 ? "" : "s"} recovered on replay.` : "The verification result is unchanged.";
  return { improved, regressed, unchanged, changedChecks, tone, summary };
}

export function verificationCsv(run: VerificationRun): string {
  const columns = ["id", "category", "label", "state", "observed", "expected", "durationMs", "route"] as const;
  const escape = (value: string | number) => `"${String(value).replaceAll('"', '""')}"`;
  return [columns.join(","), ...run.checks.map((check) => columns.map((column) => escape(check[column])).join(","))].join("\n");
}

export function verificationNextActionLabel(run: VerificationRun): string {
  return run.nextAction === "ship" ? "Use this proof in release" : run.nextAction === "review" ? "Review amber evidence" : run.nextAction === "block" ? "Repair failed evidence" : "Replay the browser run";
}

export function selectedCheckDetail(run: VerificationRun, id: VerificationCheckId): string {
  const check = verificationCheckById(run, id);
  return check ? `${check.detail} Observed ${check.observed}; expected ${check.expected}.` : "Select a browser check to see its measured evidence.";
}
