import type { ScanFinding } from "../../../packages/core/src/index";

export type TriageAction = "review" | "draft_patch" | "dismiss" | "recheck";

export interface FindingTriage {
  findingId: string;
  recommendedAction: TriageAction;
  priority: number;
  rationale: string;
  ownerRole: "frontend" | "accessibility" | "content" | "release";
}

function ownerRole(finding: ScanFinding): FindingTriage["ownerRole"] {
  if (finding.detector === "contrast" || finding.detector === "missing_label") return "accessibility";
  if (finding.detector === "stale_copy" || finding.detector === "broken_link") return "content";
  if (finding.detector === "layout_overflow" || finding.detector === "duplicate_action") return "frontend";
  return "release";
}

export function triageFinding(finding: ScanFinding): FindingTriage {
  const severityWeight: Record<ScanFinding["severity"], number> = { critical: 100, high: 80, medium: 55, low: 30, info: 10 };
  const priority = Math.round(severityWeight[finding.severity] * finding.confidence);
  const recommendedAction: TriageAction = finding.severity === "critical" || finding.severity === "high" ? "draft_patch" : finding.severity === "low" || finding.severity === "info" ? "review" : "recheck";
  return { findingId: finding.id, recommendedAction, priority, rationale: recommendedAction === "draft_patch" ? "Severity and confidence justify a narrow, reviewable fix." : recommendedAction === "recheck" ? "Run the detector again at the affected viewport before editing." : "Review the evidence and confirm whether the issue affects the release decision.", ownerRole: ownerRole(finding) };
}

export function triageFindings(findings: readonly ScanFinding[]): readonly FindingTriage[] {
  return findings.map(triageFinding).sort((left, right) => right.priority - left.priority);
}

export function triageSummary(findings: readonly ScanFinding[]): { total: number; draftPatch: number; review: number; recheck: number; owners: Readonly<Record<FindingTriage["ownerRole"], number>> } {
  const values = triageFindings(findings);
  return { total: values.length, draftPatch: values.filter((value) => value.recommendedAction === "draft_patch").length, review: values.filter((value) => value.recommendedAction === "review").length, recheck: values.filter((value) => value.recommendedAction === "recheck").length, owners: Object.fromEntries(["frontend", "accessibility", "content", "release"].map((owner) => [owner, values.filter((value) => value.ownerRole === owner).length])) as Record<FindingTriage["ownerRole"], number> };
}
