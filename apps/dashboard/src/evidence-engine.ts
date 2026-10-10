import type { DashboardData, DashboardTone } from "./dashboard-types";

export type EvidenceKind = "resolver" | "runtime" | "regression" | "quality" | "lighthouse" | "accessibility" | "release";

export type EvidenceRecord = {
  key: EvidenceKind;
  label: string;
  value: string;
  detail: string;
  tone: DashboardTone;
  status: string;
  observedAt: string;
  source: string;
};

export type EvidenceScore = {
  score: number;
  passed: number;
  review: number;
  blocked: number;
  posture: "healthy" | "review" | "blocked";
};

export type EvidenceBudget = {
  key: string;
  label: string;
  observed: number | null;
  target: number;
  unit: string;
  tone: DashboardTone;
  detail: string;
};

export type VerificationCheck = {
  id: "interaction" | "visual" | "accessibility" | "console" | "network";
  label: string;
  observed: string;
  tone: DashboardTone;
  detail: string;
};

const observationTime = "2026-10-10T08:00:00.000Z";

export function evidenceRecords(testCount = 73): EvidenceRecord[] {
  return [
    { key: "resolver", label: "Resolver benchmark", value: "200 scenarios", detail: "Moved, renamed, duplicated, missing, and ambiguous targets", tone: "green", status: "Measured", observedAt: observationTime, source: "packages/core/resolver" },
    { key: "runtime", label: "SDK browser budget", value: "7.2 KB gzip", detail: "15.3 KB budget · safe runtime stays dependency-free", tone: "green", status: "Under budget", observedAt: observationTime, source: "packages/sdk/size" },
    { key: "regression", label: "Seeded regression catch", value: "Buy button blocked", detail: "The hidden checkout action fails verification before release", tone: "green", status: "Blocked safely", observedAt: observationTime, source: "packages/verifier/hidden-buy-button" },
    { key: "quality", label: "Automated quality", value: `${testCount} tests passed`, detail: "Core, SDK, extension, verifier, AI, API, dashboard, and design contracts", tone: "green", status: "Green", observedAt: observationTime, source: "tests/" },
    { key: "accessibility", label: "Accessibility contract", value: "AA states explicit", detail: "Status language, focus rings, labels, and reduced-motion paths are covered", tone: "green", status: "Measured", observedAt: observationTime, source: "apps/dashboard/src/ui" },
    { key: "release", label: "Rollback evidence", value: "Hash chain intact", detail: "Signed manifest, previous healthy version, and tamper test are available", tone: "green", status: "Verified", observedAt: observationTime, source: "apps/api/audit" },
    { key: "lighthouse", label: "Lighthouse evidence", value: "Capture required", detail: "Run against the final dashboard and marketing routes after public surfaces land", tone: "amber", status: "Not measured", observedAt: observationTime, source: "tools/lighthouse" },
  ];
}

export function evidenceScore(records: readonly EvidenceRecord[]): EvidenceScore {
  const passed = records.filter((record) => record.tone === "green").length;
  const review = records.filter((record) => record.tone === "amber").length;
  const blocked = records.filter((record) => record.tone === "red").length;
  const score = records.length ? Math.round(((passed + review * .55) / records.length) * 100) : 0;
  return { score, passed, review, blocked, posture: blocked ? "blocked" : review ? "review" : "healthy" };
}

export function evidenceStatusLabel(score: EvidenceScore): string {
  return score.posture === "healthy" ? "Ready to ship" : score.posture === "review" ? "Safe to review" : "Blocked from ship";
}

export function evidenceToneLabel(tone: DashboardTone): string {
  return tone === "green" ? "Verified" : tone === "amber" ? "Review" : "Blocked";
}

export function evidenceRecordByKey(records: readonly EvidenceRecord[], key: EvidenceKind): EvidenceRecord | null {
  return records.find((record) => record.key === key) ?? null;
}

export function evidenceBrief(records: readonly EvidenceRecord[]): string {
  return records.map((record) => `${record.label}: ${record.value} — ${record.detail}`).join("\n");
}

export function evidenceCsv(records: readonly EvidenceRecord[]): string {
  const columns = ["key", "label", "value", "detail", "status", "observedAt", "source"] as const;
  const escape = (value: string) => `"${value.replaceAll('"', '""')}"`;
  return [columns.join(","), ...records.map((record) => columns.map((column) => escape(record[column])).join(","))].join("\n");
}

export function verificationCsv(checks: readonly VerificationCheck[]): string {
  const columns = ["id", "label", "observed", "detail"] as const;
  const escape = (value: string) => `"${value.replaceAll('"', '""')}"`;
  return [columns.join(","), ...checks.map((check) => columns.map((column) => escape(check[column])).join(","))].join("\n");
}

export function evidenceNarrative(score: EvidenceScore, records: readonly EvidenceRecord[]): string {
  const lighthouse = evidenceRecordByKey(records, "lighthouse");
  if (score.blocked) return `${score.blocked} evidence item${score.blocked === 1 ? " is" : "s are"} blocked. Resolve the red signal before release review.`;
  if (score.review && lighthouse) return `${score.passed} evidence items are verified. ${lighthouse.label} remains amber because the final browser capture has not run.`;
  return `All ${score.passed} evidence items are verified and attached to the release handoff.`;
}

export function evidenceBudgets(): EvidenceBudget[] {
  return [
    { key: "resolver-scenarios", label: "Resolver scenarios", observed: 200, target: 200, unit: "cases", tone: "green", detail: "Benchmark covers the target mutations that can invalidate a patch." },
    { key: "sdk-gzip", label: "SDK gzip", observed: 7.2, target: 15.36, unit: "KB", tone: "green", detail: "The browser runtime stays below the documented budget." },
    { key: "console-errors", label: "Console errors", observed: 0, target: 0, unit: "errors", tone: "green", detail: "The screenshot matrix completed without browser console errors." },
    { key: "lighthouse-performance", label: "Dashboard performance", observed: null, target: 90, unit: "score", tone: "amber", detail: "The budget exists; a final Lighthouse run is still required." },
    { key: "lighthouse-accessibility", label: "Dashboard accessibility", observed: null, target: 95, unit: "score", tone: "amber", detail: "The budget exists; a final Lighthouse run is still required." },
    { key: "lighthouse-best-practices", label: "Dashboard best practices", observed: null, target: 95, unit: "score", tone: "amber", detail: "The budget exists; a final Lighthouse run is still required." },
  ];
}

export function budgetProgress(budget: EvidenceBudget): number {
  if (budget.observed === null) return 0;
  if (budget.key === "sdk-gzip") return Math.min(100, Math.round((budget.target / Math.max(budget.observed, .01)) * 100));
  if (budget.target === 0) return budget.observed === 0 ? 100 : 0;
  return Math.min(100, Math.round((budget.observed / budget.target) * 100));
}

export function budgetNarrative(budget: EvidenceBudget): string {
  if (budget.observed === null) return `${budget.label} is not measured yet. Target: ${budget.target}${budget.unit}.`;
  if (budget.key === "sdk-gzip") return `${budget.observed}${budget.unit} observed against ${budget.target}${budget.unit} maximum.`;
  return `${budget.observed}${budget.unit} observed against ${budget.target}${budget.unit} target.`;
}

export function verificationChecks(): VerificationCheck[] {
  return [
    { id: "interaction", label: "Checkout interaction", observed: "12 / 12", tone: "green", detail: "The Buy action remains visible and reachable in the browser matrix." },
    { id: "visual", label: "Visual regression", observed: "1 bounded region", tone: "green", detail: "Only the intended price token changed in the visual diff." },
    { id: "accessibility", label: "Accessibility delta", observed: "0 serious", tone: "green", detail: "The patched route adds no serious or critical Axe violations." },
    { id: "console", label: "Console state", observed: "0 errors", tone: "green", detail: "The full route capture completed without browser errors." },
    { id: "network", label: "Network state", observed: "0 failures", tone: "green", detail: "The offline-safe fixture did not depend on a failed external request." },
  ];
}

export function verificationScore(checks: readonly VerificationCheck[]): number {
  return checks.length ? Math.round((checks.filter((check) => check.tone === "green").length / checks.length) * 100) : 0;
}

export function verificationNarrative(checks: readonly VerificationCheck[]): string {
  const score = verificationScore(checks);
  return `${score}% of browser evidence is green across ${checks.length} checks. The remaining release decision is policy, not hidden runtime work.`;
}

export function evidenceForSite(data: DashboardData, testCount = 73): EvidenceRecord[] {
  const records = evidenceRecords(testCount);
  const site = data.site.name;
  return records.map((record) => ({ ...record, detail: `${record.detail} · ${site} workspace.` }));
}

export function qualityGateCount(records: readonly EvidenceRecord[], tone: DashboardTone): number {
  return records.filter((record) => record.tone === tone).length;
}

export function budgetTone(budget: EvidenceBudget): DashboardTone {
  return budget.tone;
}

export function observedValue(budget: EvidenceBudget): string {
  return budget.observed === null ? "Not measured" : `${budget.observed}${budget.unit}`;
}
