import type { Patch, Release } from "../../../packages/core/src/index";
import type { ApiState } from "./types";
import { parsePolicy, type ReleasePolicy } from "./contracts";

export interface PolicyCheck {
  id: string;
  label: string;
  status: "passed" | "warning" | "failed";
  explanation: string;
}

export interface ReleasePolicyResult {
  releaseId: string;
  status: "passed" | "warning" | "blocked";
  checks: readonly PolicyCheck[];
  nextAction: string;
}

export const defaultReleasePolicy: ReleasePolicy = parsePolicy({});

export function evaluateReleasePolicy(state: ApiState, release: Release, policy: ReleasePolicy = defaultReleasePolicy): ReleasePolicyResult {
  const checks: PolicyCheck[] = [];
  const patchIds = new Set(release.manifest.patchHashes);
  const releasePatches: Patch[] = state.patches.filter((patch) => patchIds.has(patch.revision.contentHash));
  const blockingConflicts = state.conflicts.filter((conflict) => conflict.severity === "blocking" && !conflict.resolvedAt && releasePatches.some((patch) => patch.identity.id === conflict.patchId));
  checks.push({ id: "conflicts", label: "Blocking conflicts", status: blockingConflicts.length === 0 ? "passed" : "failed", explanation: blockingConflicts.length === 0 ? "No unresolved blocking conflicts are attached to this release." : `${blockingConflicts.length} unresolved blocking conflict${blockingConflicts.length === 1 ? "" : "s"} must be resolved.` });
  const approved = state.reviews.filter((review) => review.decision === "approved" && releasePatches.some((patch) => patch.identity.id === review.patchId));
  checks.push({ id: "approval", label: "Human approval", status: approved.length >= policy.requireApprovalCount ? "passed" : "warning", explanation: `${approved.length} approved review${approved.length === 1 ? "" : "s"}; policy requires ${policy.requireApprovalCount}.` });
  const report = [...state.verificationReports].reverse().find((candidate) => candidate.patchedUrl.includes(release.siteId) || candidate.id.includes(release.id));
  checks.push({ id: "verification", label: "Browser verification", status: !policy.requireVerification || report?.status === "passed" ? "passed" : report ? "failed" : "warning", explanation: !policy.requireVerification ? "Verification is optional for this policy." : report ? report.summary : "No stored verification report is attached to this release." });
  const criticalFindings = state.findings.filter((finding) => finding.severity === "critical" && releasePatches.some((patch) => patch.identity.id === finding.targetIds[0]));
  checks.push({ id: "findings", label: "Critical findings", status: policy.blockOnCriticalFinding && criticalFindings.length > 0 ? "failed" : "passed", explanation: criticalFindings.length === 0 ? "No critical scanner findings are attached." : `${criticalFindings.length} critical scanner finding${criticalFindings.length === 1 ? "" : "s"} remain.` });
  const failed = checks.some((check) => check.status === "failed");
  const warning = checks.some((check) => check.status === "warning");
  return { releaseId: release.id, status: failed ? "blocked" : warning ? "warning" : "passed", checks, nextAction: failed ? "Resolve failed policy checks before publishing." : warning ? "Review warnings before increasing rollout." : "Release is eligible for the configured rollout." };
}

export function rolloutPolicy(rolloutPercent: number, policy: ReleasePolicy = defaultReleasePolicy): PolicyCheck {
  return { id: "canary-limit", label: "Canary percentage", status: rolloutPercent <= policy.maxCanaryPercent ? "passed" : "warning", explanation: `${rolloutPercent}% is configured; policy recommends no more than ${policy.maxCanaryPercent}% before promotion.` };
}
