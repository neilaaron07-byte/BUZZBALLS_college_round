import type { GithubPullRequest } from "./types";

export interface GithubWebhookPayload {
  action: "opened" | "synchronize" | "closed" | "review_submitted" | "check_run";
  pullRequestNumber: number;
  title: string;
  branch: string;
  senderId: string;
  merged?: boolean;
  checkName?: string;
  checkStatus?: "queued" | "passed" | "failed";
  detail?: string;
}

export interface GithubMapping {
  pullRequest: GithubPullRequest;
  patchStatus: "draft" | "review" | "verified" | "live" | "rolled_back";
  verificationStatus: "queued" | "passed" | "failed";
  explanation: string;
}

export function mapGithubEvent(current: GithubPullRequest | null, payload: GithubWebhookPayload, now = new Date().toISOString()): GithubPullRequest {
  const base: GithubPullRequest = current ?? { id: `pr_${payload.pullRequestNumber}`, number: payload.pullRequestNumber, title: payload.title, branch: payload.branch, authorId: payload.senderId, state: "open", checks: [], reviewers: [], updatedAt: now };
  const state = payload.action === "closed" ? (payload.merged ? "merged" : "closed") : base.state;
  const checks = payload.checkName && payload.checkStatus ? [...base.checks.filter((check) => check.name !== payload.checkName), { name: payload.checkName, status: payload.checkStatus, detail: payload.detail ?? "GitHub check updated." }] : [...base.checks];
  return { ...base, title: payload.title || base.title, branch: payload.branch || base.branch, state, checks, updatedAt: now };
}

export function mapPullRequestToPatchStatus(pullRequest: GithubPullRequest): "draft" | "review" | "verified" | "live" | "rolled_back" {
  if (pullRequest.state === "merged") return "live";
  if (pullRequest.checks.some((check) => check.status === "failed")) return "draft";
  if (pullRequest.checks.length > 0 && pullRequest.checks.every((check) => check.status === "passed") && pullRequest.reviewers.length > 0) return "verified";
  return pullRequest.reviewers.length > 0 ? "review" : "draft";
}

export function mapPullRequest(pullRequest: GithubPullRequest): GithubMapping {
  const verificationStatus = pullRequest.checks.some((check) => check.status === "failed") ? "failed" : pullRequest.checks.length > 0 && pullRequest.checks.every((check) => check.status === "passed") ? "passed" : "queued";
  return { pullRequest, patchStatus: mapPullRequestToPatchStatus(pullRequest), verificationStatus, explanation: verificationStatus === "passed" ? "All mapped checks passed; a human review is still required before release." : verificationStatus === "failed" ? "At least one mapped check failed; release should remain blocked." : "Waiting for mapped checks to finish." };
}
