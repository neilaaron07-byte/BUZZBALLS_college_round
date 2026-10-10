import type { VerificationReport } from "../../../packages/verifier/src/index";

export interface VerificationGatePolicy {
  minimumScore: number;
  blockOnConsoleError: boolean;
  blockOnAccessibilityFailure: boolean;
  requireVisualEvidence: boolean;
}

export interface VerificationGateResult {
  status: "passed" | "warning" | "blocked";
  score: number;
  checks: readonly { id: string; status: "passed" | "warning" | "failed"; explanation: string }[];
  nextAction: string;
}

export const defaultVerificationGate: VerificationGatePolicy = { minimumScore: 90, blockOnConsoleError: true, blockOnAccessibilityFailure: true, requireVisualEvidence: true };

export function evaluateVerificationGate(report: VerificationReport, policy: VerificationGatePolicy = defaultVerificationGate): VerificationGateResult {
  const checks: { id: string; status: "passed" | "warning" | "failed"; explanation: string }[] = [];
  checks.push({ id: "score", status: report.score >= policy.minimumScore ? "passed" : "failed", explanation: `Verification score is ${report.score}; policy requires ${policy.minimumScore}.` });
  const consoleErrors = report.checks.filter((check) => check.kind === "console" && check.status === "failed");
  checks.push({ id: "console", status: consoleErrors.length === 0 || !policy.blockOnConsoleError ? "passed" : "failed", explanation: consoleErrors.length === 0 ? "No console errors were recorded." : `${consoleErrors.length} console check${consoleErrors.length === 1 ? "" : "s"} failed.` });
  const accessibilityFailures = report.checks.filter((check) => check.kind === "accessibility" && check.status === "failed");
  checks.push({ id: "accessibility", status: accessibilityFailures.length === 0 || !policy.blockOnAccessibilityFailure ? "passed" : "failed", explanation: accessibilityFailures.length === 0 ? "No blocking accessibility failures were recorded." : `${accessibilityFailures.length} accessibility check${accessibilityFailures.length === 1 ? "" : "s"} failed.` });
  checks.push({ id: "visual", status: !policy.requireVisualEvidence || report.screenshots.length > 0 ? "passed" : "warning", explanation: report.screenshots.length > 0 ? `${report.screenshots.length} viewport screenshot pair${report.screenshots.length === 1 ? "" : "s"} are available.` : "No visual screenshot evidence is attached." });
  const failed = checks.some((check) => check.status === "failed");
  const warning = checks.some((check) => check.status === "warning");
  return { status: failed ? "blocked" : warning ? "warning" : "passed", score: report.score, checks, nextAction: failed ? "Keep the release blocked and inspect the failed evidence." : warning ? "Attach the missing evidence before promotion." : "Verification gate is ready for release policy." };
}

export function verificationSummary(reports: readonly VerificationReport[]): { total: number; passed: number; blocked: number; averageScore: number } {
  return { total: reports.length, passed: reports.filter((report) => report.status === "passed").length, blocked: reports.filter((report) => report.status === "blocked").length, averageScore: reports.length === 0 ? 0 : Math.round(reports.reduce((sum, report) => sum + report.score, 0) / reports.length) };
}
