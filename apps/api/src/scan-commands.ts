import type { ScanFinding, ScanSnapshot } from "../../../packages/core/src/index";
import type { ApiState, ScanRunRecord } from "./types";
import { scanSnapshot, summarizeFindings } from "./scan-analysis";
import { triageFindings, triageSummary } from "./finding-triage";

export interface ScanCommandResult {
  status: "green" | "amber" | "red";
  summary: ReturnType<typeof summarizeFindings>;
  triage: ReturnType<typeof triageSummary>;
  findings: readonly ScanFinding[];
  nextAction: string;
}

export function analyzeSnapshot(snapshot: ScanSnapshot): ScanCommandResult {
  const result = scanSnapshot(snapshot);
  const triage = triageSummary(result.findings);
  return { status: result.summary.status, summary: result.summary, triage, findings: result.findings, nextAction: result.summary.status === "red" ? "Draft a reviewable patch for the highest-priority finding." : result.summary.status === "amber" ? "Review medium-severity findings in the viewport context." : "Continue to verification; the supported detectors are clear." };
}

export function scanRunSummary(state: ApiState, run: ScanRunRecord): ScanCommandResult {
  const findings = state.findings.filter((finding) => run.findingIds.includes(finding.id));
  const summary = summarizeFindings(findings);
  return { status: summary.status, summary, triage: triageSummary(findings), findings, nextAction: summary.status === "red" ? "Keep release blocked until the highest-priority finding is reviewed." : "Open the finding list for the next safe action." };
}

export function findingActionMap(findings: readonly ScanFinding[]): Readonly<Record<string, string>> {
  return Object.fromEntries(triageFindings(findings).map((triage) => [triage.findingId, triage.recommendedAction]));
}
