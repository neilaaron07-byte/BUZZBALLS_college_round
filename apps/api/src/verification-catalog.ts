import type { VerificationReport } from "../../../packages/verifier/src/index";
import type { ApiState } from "./types";
import { evaluateVerificationGate, verificationSummary } from "./verification-gate";

export interface VerificationCatalogItem {
  report: VerificationReport;
  gate: ReturnType<typeof evaluateVerificationGate>;
  releaseId: string | null;
  risk: "low" | "medium" | "high";
}

export function catalogVerification(state: ApiState, report: VerificationReport): VerificationCatalogItem {
  const gate = evaluateVerificationGate(report);
  const releaseId = state.releases.find((release) => report.id.includes(release.id))?.id ?? null;
  return { report, gate, releaseId, risk: report.status === "blocked" || gate.status === "blocked" ? "high" : report.status === "warning" || gate.status === "warning" ? "medium" : "low" };
}

export function verificationCatalog(state: ApiState): readonly VerificationCatalogItem[] {
  return state.verificationReports.map((report) => catalogVerification(state, report)).sort((left, right) => right.report.createdAt.localeCompare(left.report.createdAt));
}

export function verificationOverview(state: ApiState): ReturnType<typeof verificationSummary> & { highRisk: number; latest: VerificationCatalogItem | null } {
  const items = verificationCatalog(state);
  return { ...verificationSummary(state.verificationReports), highRisk: items.filter((item) => item.risk === "high").length, latest: items[0] ?? null };
}
