import type { DashboardData, DashboardTone } from "./dashboard-types";

export type EvidenceKind = "resolver" | "runtime" | "regression" | "quality" | "lighthouse" | "accessibility" | "release" | "api" | "rollback" | "layout";

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
    { key: "api", label: "API read latency", value: "4.08 ms p95", detail: "32 seeded workspace, site, and release reads stay below the 50 ms service target", tone: "green", status: "Under budget", observedAt: observationTime, source: "tools/performance-evidence" },
    { key: "rollback", label: "Rollback recovery", value: "18.78 ms end to end", detail: "The seeded bad-release path restores the last healthy manifest within the 10 second target", tone: "green", status: "Under budget", observedAt: observationTime, source: "tools/performance-evidence" },
    { key: "layout", label: "Layout stability", value: "0.02 CLS", detail: "Dashboard and landing captures reserve the final card geometry before interaction", tone: "green", status: "Under budget", observedAt: observationTime, source: "tools/performance-evidence" },
    { key: "lighthouse", label: "Lighthouse evidence", value: "57 / 100 / 100 web · 49 / 96 / 100 dashboard", detail: "Mobile Lighthouse scores for performance / accessibility / best practices; performance remains below the release target", tone: "amber", status: "Below target", observedAt: observationTime, source: "docs/evidence/lighthouse-*.json" },
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
  if (score.review && lighthouse) return `${score.passed} evidence items are verified. ${lighthouse.label} remains amber because the measured performance scores are below target.`;
  return `All ${score.passed} evidence items are verified and attached to the release handoff.`;
}

export function evidenceBudgets(): EvidenceBudget[] {
  return [
    { key: "resolver-scenarios", label: "Resolver scenarios", observed: 200, target: 200, unit: "cases", tone: "green", detail: "Benchmark covers the target mutations that can invalidate a patch." },
    { key: "sdk-gzip", label: "SDK gzip", observed: 7.2, target: 15.36, unit: "KB", tone: "green", detail: "The browser runtime stays below the documented budget." },
    { key: "console-errors", label: "Console errors", observed: 0, target: 0, unit: "errors", tone: "green", detail: "The screenshot matrix completed without browser console errors." },
    { key: "api-p95", label: "API read p95", observed: 4.08, target: 50, unit: "ms", tone: "green", detail: "32 seeded read samples remain below the service objective." },
    { key: "rollback-seconds", label: "Rollback duration", observed: 0.01878, target: 10, unit: "s", tone: "green", detail: "The signed previous manifest restores the visitor path inside the release objective." },
    { key: "cumulative-layout-shift", label: "Cumulative layout shift", observed: 0.02, target: 0.1, unit: "CLS", tone: "green", detail: "Reserved dashboard and landing geometry keeps the interaction path stable." },
    { key: "lighthouse-web-performance", label: "Landing performance", observed: 57, target: 90, unit: "score", tone: "red", detail: "Measured mobile Lighthouse score; the current dev supervisor is too heavy for the performance target." },
    { key: "lighthouse-web-accessibility", label: "Landing accessibility", observed: 100, target: 95, unit: "score", tone: "green", detail: "Measured mobile Lighthouse score after the command button accessibility repair." },
    { key: "lighthouse-web-best-practices", label: "Landing best practices", observed: 100, target: 95, unit: "score", tone: "green", detail: "Measured mobile Lighthouse score against the release target." },
    { key: "lighthouse-dashboard-performance", label: "Dashboard performance", observed: 49, target: 90, unit: "score", tone: "red", detail: "Measured mobile Lighthouse score; the current dev supervisor is too heavy for the performance target." },
    { key: "lighthouse-dashboard-accessibility", label: "Dashboard accessibility", observed: 96, target: 95, unit: "score", tone: "green", detail: "Measured mobile Lighthouse score after the metadata and shortcut label repairs." },
    { key: "lighthouse-dashboard-best-practices", label: "Dashboard best practices", observed: 100, target: 95, unit: "score", tone: "green", detail: "Measured mobile Lighthouse score against the release target." },
  ];
}

export function budgetProgress(budget: EvidenceBudget): number {
  if (budget.observed === null) return 0;
  if (budget.key === "sdk-gzip" || budget.key === "api-p95" || budget.key === "rollback-seconds" || budget.key === "cumulative-layout-shift") return Math.min(100, Math.round((budget.target / Math.max(budget.observed, .01)) * 100));
  if (budget.target === 0) return budget.observed === 0 ? 100 : 0;
  return Math.min(100, Math.round((budget.observed / budget.target) * 100));
}

export function budgetNarrative(budget: EvidenceBudget): string {
  if (budget.observed === null) return `${budget.label} is not measured yet. Target: ${budget.target}${budget.unit}.`;
  if (budget.key === "rollback-seconds" && budget.observed < 1) return `${Math.round(budget.observed * 1000)}ms observed against ${budget.target}${budget.unit} maximum.`;
  if (budget.key === "sdk-gzip" || budget.key === "api-p95" || budget.key === "rollback-seconds" || budget.key === "cumulative-layout-shift") return `${budget.observed}${budget.unit} observed against ${budget.target}${budget.unit} maximum.`;
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
  if (budget.observed === null) return "Not measured";
  if (budget.key === "rollback-seconds" && budget.observed < 1) return `${Math.round(budget.observed * 1000)}ms`;
  return `${budget.observed}${budget.unit}`;
}
