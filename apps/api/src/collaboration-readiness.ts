import type { Patch } from "../../../packages/core/src/index";
import { approvalTimeline, buildApprovalWorkflow } from "./approval-workflow";
import { mapPullRequest } from "./github-sync";
import { can, permissionMatrix, type Permission } from "./permissions";
import { publicAuthor, publicPatch, type PublicAuthor } from "./normalizers";
import type { ApiState, Collaborator, GithubPullRequest, ReviewRecord } from "./types";

export type CollaborationTone = "green" | "amber" | "red";

export interface ReviewQueueItem {
  patch: ReturnType<typeof publicPatch>;
  status: "ready" | "waiting" | "blocked";
  tone: CollaborationTone;
  latestDecision: ReviewRecord["decision"] | null;
  reviewers: readonly PublicAuthor[];
  owner: PublicAuthor;
  explanation: string;
}

export interface PullRequestView {
  id: string;
  number: number;
  title: string;
  branch: string;
  state: GithubPullRequest["state"];
  checks: readonly GithubPullRequest["checks"][number][];
  patchStatus: string;
  verificationStatus: string;
  explanation: string;
}

export interface CollaborationReport {
  siteId: string;
  generatedAt: string;
  tone: CollaborationTone;
  label: string;
  explanation: string;
  queue: readonly ReviewQueueItem[];
  pullRequests: readonly PullRequestView[];
  collaborators: readonly { id: string; author: PublicAuthor; role: Collaborator["role"]; permissions: readonly Permission[] }[];
  counts: { waiting: number; blocked: number; ready: number; failedChecks: number };
  nextOwner: PublicAuthor | null;
}

function patchForReview(state: ApiState, patch: Patch): ReviewQueueItem {
  const collaborators = state.collaborators;
  const publicView = publicPatch(patch, collaborators);
  const owner = publicView.author;
  const reviewers = patch.reviewers.map(publicAuthor);
  const reviews = state.reviews.filter((review) => review.patchId === patch.identity.id).sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  const latestDecision = reviews[0]?.decision ?? null;
  const workflow = buildApprovalWorkflow(state, patch);
  const blocked = workflow.status === "blocked" || patch.status === "rejected";
  const waiting = !blocked && (workflow.status === "warning" || patch.status === "draft" || patch.status === "review");
  const status: ReviewQueueItem["status"] = blocked ? "blocked" : waiting ? "waiting" : "ready";
  const tone: CollaborationTone = blocked ? "red" : waiting ? "amber" : "green";
  const explanation = blocked ? workflow.nextAction : waiting ? workflow.nextAction : "This patch has the approval evidence needed for the next release gate.";
  return { patch: publicView, status, tone, latestDecision, reviewers, owner, explanation };
}

function pullRequestView(pullRequest: GithubPullRequest): PullRequestView {
  const mapping = mapPullRequest(pullRequest);
  return { id: pullRequest.id, number: pullRequest.number, title: pullRequest.title, branch: pullRequest.branch, state: pullRequest.state, checks: pullRequest.checks, patchStatus: mapping.patchStatus, verificationStatus: mapping.verificationStatus, explanation: mapping.explanation };
}

function sitePatches(state: ApiState, siteId: string): readonly Patch[] {
  return state.patches.filter((patch) => patch.identity.siteId === siteId);
}

function queueSort(left: ReviewQueueItem, right: ReviewQueueItem): number {
  const order: Readonly<Record<ReviewQueueItem["status"], number>> = { blocked: 0, waiting: 1, ready: 2 };
  return order[left.status] - order[right.status] || right.patch.updatedAt.localeCompare(left.patch.updatedAt);
}

function queueCounts(queue: readonly ReviewQueueItem[], pullRequests: readonly PullRequestView[]): CollaborationReport["counts"] {
  return { waiting: queue.filter((item) => item.status === "waiting").length, blocked: queue.filter((item) => item.status === "blocked").length, ready: queue.filter((item) => item.status === "ready").length, failedChecks: pullRequests.reduce((total, item) => total + item.checks.filter((check) => check.status === "failed").length, 0) };
}

function collaborationTone(counts: CollaborationReport["counts"]): CollaborationTone {
  return counts.blocked > 0 || counts.failedChecks > 0 ? "red" : counts.waiting > 0 ? "amber" : "green";
}

function collaborationLabel(tone: CollaborationTone): string {
  return tone === "red" ? "Collaboration is blocked" : tone === "amber" ? "Reviews need attention" : "Team is ready to ship";
}

function nextOwner(queue: readonly ReviewQueueItem[], collaborators: readonly Collaborator[]): PublicAuthor | null {
  const waiting = queue.find((item) => item.status === "waiting");
  if (waiting) return waiting.reviewers[0] ?? waiting.owner;
  const reviewer = collaborators.find((collaborator) => collaborator.role === "reviewer");
  return reviewer ? publicAuthor(reviewer.author) : collaborators[0] ? publicAuthor(collaborators[0].author) : null;
}

export function buildCollaborationReport(state: ApiState, siteId: string, generatedAt = new Date().toISOString()): CollaborationReport {
  const queue = sitePatches(state, siteId).map((patch) => patchForReview(state, patch)).sort(queueSort);
  const pullRequests = state.pullRequests.map(pullRequestView);
  const counts = queueCounts(queue, pullRequests);
  const tone = collaborationTone(counts);
  const collaborators = state.collaborators.filter((collaborator) => collaborator.siteId === siteId).map((collaborator) => ({ id: collaborator.id, author: publicAuthor(collaborator.author), role: collaborator.role, permissions: permissionMatrix().find((item) => item.role === collaborator.role)?.permissions ?? [] }));
  const owner = nextOwner(queue, state.collaborators.filter((collaborator) => collaborator.siteId === siteId));
  const explanation = tone === "red" ? "A blocked patch or failed check must be resolved before the release can move forward." : tone === "amber" ? "At least one patch is waiting for a human review or acknowledgement." : "The review queue and mapped checks are clear for the next release step.";
  return { siteId, generatedAt, tone, label: collaborationLabel(tone), explanation, queue, pullRequests, collaborators, counts, nextOwner: owner };
}

export function reviewQueueForStatus(report: CollaborationReport, status: ReviewQueueItem["status"] | undefined): readonly ReviewQueueItem[] {
  return status ? report.queue.filter((item) => item.status === status) : report.queue;
}

export function collaborationNarrative(report: CollaborationReport): string {
  return `${report.label}. ${report.counts.waiting} waiting, ${report.counts.blocked} blocked, ${report.counts.ready} ready, and ${report.counts.failedChecks} failed checks. ${report.explanation}`;
}

export function reviewerCanReview(role: Collaborator["role"]): boolean {
  return can(role, "patch:review");
}

export function collaborationCsvRows(report: CollaborationReport): readonly (readonly (string | number | boolean | null)[])[] {
  return [["patch", "status", "tone", "owner", "latestDecision", "explanation"], ...report.queue.map((item) => [item.patch.id, item.status, item.tone, item.owner.name, item.latestDecision, item.explanation])];
}

export function reviewTimelineForPatch(state: ApiState, patchId: string): ReturnType<typeof approvalTimeline> {
  return approvalTimeline(state, patchId);
}
