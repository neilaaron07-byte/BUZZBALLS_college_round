import type { ScanFinding, ScanSnapshot } from "../../../packages/core/src/index";
import { scanPage } from "../../../packages/core/src/index";
import type { ScanRunRecord } from "./types";

export interface ScanSummary {
  total: number;
  bySeverity: Record<ScanFinding["severity"], number>;
  byDetector: Record<ScanFinding["detector"], number>;
  highest: ScanFinding | null;
  status: "green" | "amber" | "red";
}

export interface ScanComparison {
  resolved: readonly string[];
  newFindings: readonly string[];
  unchanged: readonly string[];
  status: "improved" | "unchanged" | "regressed";
}

const severities: readonly ScanFinding["severity"][] = ["critical", "high", "medium", "low", "info"];
const detectors: readonly ScanFinding["detector"][] = ["contrast", "duplicate_action", "stale_copy", "missing_label", "broken_link", "layout_overflow"];

export function summarizeFindings(findings: readonly ScanFinding[]): ScanSummary {
  const bySeverity = Object.fromEntries(severities.map((severity) => [severity, findings.filter((finding) => finding.severity === severity).length])) as Record<ScanFinding["severity"], number>;
  const byDetector = Object.fromEntries(detectors.map((detector) => [detector, findings.filter((finding) => finding.detector === detector).length])) as Record<ScanFinding["detector"], number>;
  const highest = [...findings].sort((left, right) => (severities.indexOf(left.severity) - severities.indexOf(right.severity)) || right.confidence - left.confidence)[0] ?? null;
  return { total: findings.length, bySeverity, byDetector, highest, status: bySeverity.critical + bySeverity.high > 0 ? "red" : bySeverity.medium + bySeverity.low > 0 ? "amber" : "green" };
}

export function compareFindings(before: readonly ScanFinding[], after: readonly ScanFinding[]): ScanComparison {
  const beforeIds = new Set(before.map((finding) => finding.id));
  const afterIds = new Set(after.map((finding) => finding.id));
  const resolved = [...beforeIds].filter((id) => !afterIds.has(id));
  const newFindings = [...afterIds].filter((id) => !beforeIds.has(id));
  const unchanged = [...afterIds].filter((id) => beforeIds.has(id));
  return { resolved, newFindings, unchanged, status: newFindings.length > resolved.length ? "regressed" : resolved.length > newFindings.length ? "improved" : "unchanged" };
}

export function scanSnapshot(snapshot: ScanSnapshot): { findings: readonly ScanFinding[]; summary: ScanSummary } {
  const findings = scanPage(snapshot);
  return { findings, summary: summarizeFindings(findings) };
}

export function scanRunStatus(run: ScanRunRecord, findings: readonly ScanFinding[]): "green" | "amber" | "red" {
  if (run.status === "failed") return "red";
  return summarizeFindings(findings).status;
}

export function detectorCoverage(findings: readonly ScanFinding[]): readonly { detector: ScanFinding["detector"]; count: number; confidence: number }[] {
  return detectors.map((detector) => { const values = findings.filter((finding) => finding.detector === detector); return { detector, count: values.length, confidence: values.length === 0 ? 1 : Number((values.reduce((sum, finding) => sum + finding.confidence, 0) / values.length).toFixed(2)) }; });
}
