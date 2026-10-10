import type { Conflict, Patch, Release, ScanFinding } from "../../../packages/core/src/index";

export interface PolicyExplanation {
  status: "green" | "amber" | "red";
  headline: string;
  sentence: string;
  evidence: readonly string[];
  nextAction: string;
}

export function explainPatchPolicy(patch: Patch, conflicts: readonly Conflict[]): PolicyExplanation {
  const blocking = conflicts.filter((conflict) => conflict.severity === "blocking" && !conflict.resolvedAt);
  const status = blocking.length > 0 ? "red" : conflicts.length > 0 ? "amber" : "green";
  return { status, headline: status === "green" ? "Patch is clear to review" : status === "amber" ? "Patch has review items" : "Patch is blocked", sentence: blocking.length > 0 ? `${patch.title} has ${blocking.length} blocking conflict${blocking.length === 1 ? "" : "s"}; resolve the conflict before release.` : conflicts.length > 0 ? `${patch.title} has non-blocking overlap that a reviewer should acknowledge.` : `${patch.title} has no unresolved conflict in the current workspace.`, evidence: [`Patch ${patch.identity.id}`, `Revision ${patch.revision.revision}`, `Operations ${patch.operations.length}`, `Conflicts ${conflicts.length}`], nextAction: blocking.length > 0 ? "Open the conflict merge view" : "Open the isolated preview" };
}

export function explainFindingPolicy(finding: ScanFinding): PolicyExplanation {
  const status = finding.severity === "critical" || finding.severity === "high" ? "red" : finding.severity === "medium" ? "amber" : "green";
  return { status, headline: finding.summary, sentence: `${finding.explanation} The detector confidence is ${Math.round(finding.confidence * 100)}%.`, evidence: finding.evidence, nextAction: status === "red" ? "Draft a reviewable patch" : "Review the element in context" };
}

export function explainReleasePolicy(release: Release, conflicts: readonly Conflict[], hasVerification: boolean): PolicyExplanation {
  const blocking = conflicts.some((conflict) => conflict.severity === "blocking" && !conflict.resolvedAt);
  const status = blocking || !hasVerification ? "red" : conflicts.length > 0 ? "amber" : "green";
  return { status, headline: status === "green" ? "Release is eligible" : status === "amber" ? "Release needs review" : "Release remains blocked", sentence: blocking ? "An unresolved blocking conflict prevents release." : !hasVerification ? "A passing verification report is required before publishing." : `${release.title} has the evidence required for the current policy.`, evidence: [`Release ${release.id}`, `Verification ${hasVerification ? "passed" : "missing"}`, `Open conflicts ${conflicts.length}`], nextAction: status === "green" ? "Start the canary rollout" : "Resolve the red evidence" };
}
