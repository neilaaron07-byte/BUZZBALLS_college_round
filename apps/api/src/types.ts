import type { Request } from "express";
import type { AuditEntry, Author, Conflict, Environment, HealthEvent, Manifest, Patch, Release, ScanFinding as Finding, Site } from "../../../packages/core/src/index";
import type { VerificationReport } from "../../../packages/verifier/src/index";

export interface Collaborator {
  id: string;
  siteId: string;
  author: Author;
  role: "owner" | "editor" | "reviewer" | "viewer";
  joinedAt: string;
}

export interface ReviewRecord {
  id: string;
  patchId: string;
  author: Author;
  decision: "approved" | "rejected" | "changes_requested";
  note: string;
  createdAt: string;
}

export interface ScanRunRecord {
  id: string;
  siteId: string;
  pageUrl: string;
  status: "queued" | "running" | "completed" | "failed";
  detectorCount: number;
  findingIds: readonly string[];
  summary: string;
  snapshotHash: string;
  startedAt: string;
  finishedAt: string | null;
  error: string | null;
}

export interface PatchRevisionRecord {
  patchId: string;
  revision: number;
  contentHash: string;
  baseManifestHash: string;
  message: string;
  authorId: string;
  createdAt: string;
}

export interface PreviewRecord {
  id: string;
  patchId: string;
  releaseId: string;
  manifest: Manifest;
  previewUrl: string;
  status: "active" | "expired" | "revoked";
  createdAt: string;
  expiresAt: string;
}

export interface RolloutState {
  releaseId: string;
  canaryPercent: number;
  paused: boolean;
  killSwitch: { enabled: boolean; reason: string | null; enabledAt: string | null; enabledBy: string | null };
  updatedAt: string;
}

export interface GithubPullRequest {
  id: string;
  number: number;
  title: string;
  branch: string;
  authorId: string;
  state: "open" | "merged" | "closed";
  checks: readonly { name: string; status: "queued" | "passed" | "failed"; detail: string }[];
  reviewers: readonly string[];
  updatedAt: string;
}

export interface ApiMetrics {
  requests: number;
  errors: number;
  idempotentReplays: number;
  bytesRejected: number;
  startedAt: string;
}

export interface ApiState {
  schemaVersion: 1;
  sites: Site[];
  environments: Environment[];
  collaborators: Collaborator[];
  patches: Patch[];
  findings: Finding[];
  conflicts: Conflict[];
  reviews: ReviewRecord[];
  scanRuns: ScanRunRecord[];
  patchRevisions: PatchRevisionRecord[];
  previews: PreviewRecord[];
  releases: Release[];
  rollouts: RolloutState[];
  verificationReports: VerificationReport[];
  healthEvents: HealthEvent[];
  auditEntries: AuditEntry[];
  pullRequests: GithubPullRequest[];
  metrics: ApiMetrics;
}

export interface RequestWithId extends Request {
  requestId?: string;
  startedAt?: number;
}

export interface ApiContext {
  repository: import("./store").JsonRepository<ApiState>;
  startedAt: number;
  requestCache: Map<string, { status: number; body: unknown; expiresAt: number }>;
  liveScanJobs: Map<string, import("./live-site").LiveScanJob>;
  idempotencyTtlMs: number;
  volatileMetrics: { requests: number; errors: number; idempotentReplays: number; bytesRejected: number };
}

export interface ApiEnvelope<T> {
  data: T;
  requestId: string;
}

export interface ErrorEnvelope {
  error: { code: string; message: string; requestId: string; details?: unknown };
}
