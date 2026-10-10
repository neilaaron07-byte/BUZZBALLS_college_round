import type { AuditEntry, Conflict, Patch, Release, ScanFinding, Site } from "../../../packages/core/src/index";
import type { ApiState, Collaborator, ReviewRecord, RolloutState } from "./types";

export interface PublicAuthor {
  id: string;
  name: string;
  initials: string;
}

export interface PublicPatch {
  id: string;
  siteId: string;
  title: string;
  description: string;
  status: Patch["status"];
  revision: number;
  contentHash: string;
  operationCount: number;
  reviewerCount: number;
  tags: readonly string[];
  updatedAt: string;
  author: PublicAuthor;
}

export interface ReleaseTimelineEntry {
  id: string;
  version: string;
  title: string;
  status: Release["status"];
  environment: Release["environment"];
  createdAt: string;
  publishedAt: string | null;
  rolledBackAt: string | null;
  rollout: RolloutState | null;
}

export interface ActivityItem {
  id: string;
  timestamp: string;
  type: "audit" | "finding" | "scan" | "review" | "health";
  title: string;
  detail: string;
  severity: "info" | "warning" | "critical";
  subjectId: string;
}

export function publicAuthor(author: { id: string; name: string }): PublicAuthor {
  const initials = author.name.split(/\s+/).map((part) => part[0] ?? "").join("").slice(0, 2).toUpperCase();
  return { id: author.id, name: author.name, initials };
}

export function publicSite(site: Site): Omit<Site, "owner"> & { owner: PublicAuthor } {
  return { ...site, owner: publicAuthor(site.owner) };
}

export function publicPatch(patch: Patch, collaborators: readonly Collaborator[]): PublicPatch {
  const author = collaborators.find((collaborator) => collaborator.author.id === patch.identity.createdBy)?.author ?? { id: patch.identity.createdBy, name: "Unknown collaborator" };
  return { id: patch.identity.id, siteId: patch.identity.siteId, title: patch.title, description: patch.description, status: patch.status, revision: patch.revision.revision, contentHash: patch.revision.contentHash, operationCount: patch.operations.length, reviewerCount: patch.reviewers.length, tags: patch.tags, updatedAt: patch.updatedAt, author: publicAuthor(author) };
}

export function releaseTimeline(releases: readonly Release[], rollouts: readonly RolloutState[]): ReleaseTimelineEntry[] {
  return [...releases].sort((left, right) => right.createdAt.localeCompare(left.createdAt)).map((release) => ({ id: release.id, version: release.version, title: release.title, status: release.status, environment: release.environment, createdAt: release.createdAt, publishedAt: release.publishedAt, rolledBackAt: release.rolledBackAt, rollout: rollouts.find((rollout) => rollout.releaseId === release.id) ?? null }));
}

export function activityFromState(state: ApiState, siteId: string): ActivityItem[] {
  const releaseIds = new Set(state.releases.filter((release) => release.siteId === siteId).map((release) => release.id));
  const patchIds = new Set(state.patches.filter((patch) => patch.identity.siteId === siteId).map((patch) => patch.identity.id));
  const auditItems = state.auditEntries.filter((entry) => patchIds.has(entry.subjectId) || releaseIds.has(entry.subjectId)).map((entry) => auditActivity(entry));
  const findings = state.findings.map((finding) => ({ id: `activity_${finding.id}`, timestamp: state.scanRuns.find((scan) => scan.findingIds.includes(finding.id))?.finishedAt ?? new Date(0).toISOString(), type: "finding" as const, title: finding.summary, detail: finding.explanation, severity: finding.severity === "critical" || finding.severity === "high" ? "critical" as const : finding.severity === "medium" ? "warning" as const : "info" as const, subjectId: finding.id }));
  const scans = state.scanRuns.filter((scan) => scan.siteId === siteId).map((scan) => ({ id: `activity_${scan.id}`, timestamp: scan.finishedAt ?? scan.startedAt, type: "scan" as const, title: "Website scan completed", detail: scan.summary, severity: scan.status === "failed" ? "critical" as const : scan.findingIds.length > 0 ? "warning" as const : "info" as const, subjectId: scan.id }));
  const reviews = state.reviews.filter((review) => patchIds.has(review.patchId)).map((review) => ({ id: `activity_${review.id}`, timestamp: review.createdAt, type: "review" as const, title: `Patch review ${review.decision.replaceAll("_", " ")}`, detail: review.note, severity: review.decision === "rejected" ? "critical" as const : review.decision === "changes_requested" ? "warning" as const : "info" as const, subjectId: review.patchId }));
  const health = state.healthEvents.filter((event) => releaseIds.has(event.releaseId)).map((event) => ({ id: `activity_${event.id}`, timestamp: event.observedAt, type: "health" as const, title: `Health signal ${event.status}`, detail: event.explanation, severity: event.status === "critical" ? "critical" as const : event.status === "degraded" ? "warning" as const : "info" as const, subjectId: event.releaseId }));
  return [...auditItems, ...findings, ...scans, ...reviews, ...health].sort((left, right) => right.timestamp.localeCompare(left.timestamp));
}

function auditActivity(entry: AuditEntry): ActivityItem {
  const critical = entry.action === "release_rolled_back" || entry.action === "kill_switch_changed";
  return { id: `activity_${entry.id}`, timestamp: entry.timestamp, type: "audit", title: entry.action.replaceAll("_", " "), detail: entry.details.message ?? "PATCHWORK recorded an audit event.", severity: critical ? "critical" : "info", subjectId: entry.subjectId };
}

export function findingView(finding: ScanFinding): ScanFinding & { status: "open" | "reviewed" } {
  return { ...finding, status: "open" };
}

export function conflictView(conflict: Conflict): Conflict & { status: "open" | "resolved" } {
  return { ...conflict, status: conflict.resolvedAt ? "resolved" : "open" };
}

export function reviewView(review: ReviewRecord): Omit<ReviewRecord, "author"> & { author: PublicAuthor } {
  return { ...review, author: publicAuthor(review.author) };
}

export function csvEscape(value: string | number | boolean | null): string {
  const normalized = value === null ? "" : String(value);
  return /[",\n]/.test(normalized) ? `"${normalized.replaceAll('"', '""')}"` : normalized;
}

export function toCsv(rows: readonly (readonly (string | number | boolean | null)[])[]): string {
  return rows.map((row) => row.map(csvEscape).join(",")).join("\n");
}
