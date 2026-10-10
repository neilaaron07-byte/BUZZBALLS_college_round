import type { Patch, Release } from "../../../packages/core/src/index";
import type { ApiState } from "./types";

export interface ApprovalPolicy {
  requiredReviewers: number;
  requireDistinctAuthors: boolean;
  allowSelfApproval: boolean;
}

export interface ApprovalResult {
  status: "passed" | "warning" | "blocked";
  approved: number;
  required: number;
  reviewers: readonly string[];
  explanation: string;
}

export const defaultApprovalPolicy: ApprovalPolicy = { requiredReviewers: 1, requireDistinctAuthors: true, allowSelfApproval: false };

export function evaluatePatchApproval(state: ApiState, patch: Patch, policy: ApprovalPolicy = defaultApprovalPolicy): ApprovalResult {
  const reviews = state.reviews.filter((review) => review.patchId === patch.identity.id && review.decision === "approved");
  const reviewers = [...new Set(reviews.map((review) => review.author.id))];
  const hasSelfApproval = !policy.allowSelfApproval && reviewers.includes(patch.identity.createdBy);
  const passed = reviewers.length >= policy.requiredReviewers && (!policy.requireDistinctAuthors || reviewers.length === reviews.length) && !hasSelfApproval;
  const warning = reviewers.length > 0 && !passed;
  return { status: passed ? "passed" : warning ? "warning" : "blocked", approved: reviewers.length, required: policy.requiredReviewers, reviewers, explanation: passed ? "Patch has the required distinct approval." : hasSelfApproval ? "The patch author cannot be its only approver under this policy." : `Patch has ${reviewers.length} approved reviewer${reviewers.length === 1 ? "" : "s"}; policy requires ${policy.requiredReviewers}.` };
}

export function evaluateReleaseApprovals(state: ApiState, release: Release, policy = defaultApprovalPolicy): ApprovalResult {
  const patches = state.patches.filter((patch) => release.manifest.patchHashes.includes(patch.revision.contentHash));
  const results = patches.map((patch) => evaluatePatchApproval(state, patch, policy));
  const approved = results.reduce((sum, result) => sum + result.approved, 0);
  const blocked = results.some((result) => result.status === "blocked");
  return { status: blocked ? "blocked" : results.some((result) => result.status === "warning") ? "warning" : "passed", approved, required: patches.length * policy.requiredReviewers, reviewers: [...new Set(results.flatMap((result) => result.reviewers))], explanation: patches.length === 0 ? "Release contains no linked patches." : blocked ? "At least one linked patch is missing a valid approval." : "All linked patches meet the approval policy." };
}
