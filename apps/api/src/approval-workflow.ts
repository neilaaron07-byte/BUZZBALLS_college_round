import type { Patch, Release } from "../../../packages/core/src/index";
import type { ApiState, ReviewRecord } from "./types";
import { evaluatePatchApproval, evaluateReleaseApprovals } from "./approval-policy";

export interface ApprovalTimelineItem {
  id: string;
  patchId: string;
  decision: ReviewRecord["decision"];
  actor: string;
  createdAt: string;
  isLatest: boolean;
}

export interface ApprovalWorkflow {
  status: "passed" | "warning" | "blocked";
  patch: ReturnType<typeof evaluatePatchApproval>;
  release: ReturnType<typeof evaluateReleaseApprovals> | null;
  timeline: readonly ApprovalTimelineItem[];
  nextAction: string;
}

export function approvalTimeline(state: ApiState, patchId: string): readonly ApprovalTimelineItem[] {
  const reviews = state.reviews.filter((review) => review.patchId === patchId).sort((left, right) => left.createdAt.localeCompare(right.createdAt));
  const latestId = reviews.at(-1)?.id;
  return reviews.map((review) => ({ id: review.id, patchId, decision: review.decision, actor: review.author.name, createdAt: review.createdAt, isLatest: review.id === latestId }));
}

export function buildApprovalWorkflow(state: ApiState, patch: Patch, release?: Release): ApprovalWorkflow {
  const patchResult = evaluatePatchApproval(state, patch);
  const releaseResult = release ? evaluateReleaseApprovals(state, release) : null;
  const status = patchResult.status === "blocked" || releaseResult?.status === "blocked" ? "blocked" : patchResult.status === "warning" || releaseResult?.status === "warning" ? "warning" : "passed";
  return { status, patch: patchResult, release: releaseResult, timeline: approvalTimeline(state, patch.identity.id), nextAction: status === "passed" ? "Continue to isolated verification." : status === "warning" ? "Ask a reviewer to acknowledge the approval policy." : "Add a valid distinct approval before release." };
}

export function approvalCounts(state: ApiState): { approved: number; rejected: number; changesRequested: number } {
  return { approved: state.reviews.filter((review) => review.decision === "approved").length, rejected: state.reviews.filter((review) => review.decision === "rejected").length, changesRequested: state.reviews.filter((review) => review.decision === "changes_requested").length };
}
