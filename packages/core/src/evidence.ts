import { z } from "zod";
import { authorSchema, contentHashSchema, identifierSchema, isoDateSchema } from "./schemas";

export const reviewDecisionSchema = z.enum(["approved", "rejected", "changes_requested"]);
export const reviewSchema = z.object({
  id: identifierSchema,
  patchId: identifierSchema,
  decision: reviewDecisionSchema,
  author: authorSchema,
  note: z.string().min(1).max(1_000),
  createdAt: isoDateSchema,
}).strict();

export const conflictKindSchema = z.enum([
  "property",
  "hide_style",
  "reorder",
  "stale_manifest",
  "dependency",
  "ambiguous_target",
]);

export const conflictSchema = z.object({
  id: identifierSchema,
  patchId: identifierSchema,
  kind: conflictKindSchema,
  severity: z.enum(["warning", "blocking"]),
  targetFingerprint: z.string().min(16).max(512),
  explanation: z.string().min(1).max(1_000),
  suggestedResolution: z.string().min(1).max(1_000),
  leftRevision: z.number().int().positive().nullable(),
  rightRevision: z.number().int().positive().nullable(),
  resolvedAt: isoDateSchema.nullable(),
  resolvedBy: identifierSchema.nullable(),
}).strict();

export const verificationCheckSchema = z.object({
  id: identifierSchema,
  name: z.string().min(1).max(160),
  category: z.enum(["browser", "visual", "accessibility", "security", "performance"]),
  status: z.enum(["passed", "warning", "failed", "skipped"]),
  explanation: z.string().min(1).max(1_000),
  durationMs: z.number().int().nonnegative().max(600_000),
  evidence: z.array(z.string().max(2_000)).max(20),
}).strict();

export const verificationRunSchema = z.object({
  id: identifierSchema,
  patchId: identifierSchema,
  environment: z.enum(["preview", "staging", "production"]),
  status: z.enum(["queued", "running", "passed", "failed", "cancelled"]),
  checks: z.array(verificationCheckSchema).max(200),
  startedAt: isoDateSchema,
  finishedAt: isoDateSchema.nullable(),
}).strict();

export const healthEventSchema = z.object({
  id: identifierSchema,
  releaseId: identifierSchema,
  type: z.enum(["request_rate", "error_rate", "latency", "visual_regression", "browser_check", "kill_switch"]),
  status: z.enum(["healthy", "degraded", "critical"]),
  observedAt: isoDateSchema,
  value: z.number().finite(),
  threshold: z.number().finite().nullable(),
  explanation: z.string().min(1).max(1_000),
}).strict();

export const auditEntrySchema = z.object({
  sequence: z.number().int().nonnegative(),
  id: identifierSchema,
  action: z.enum(["patch_created", "patch_reviewed", "patch_verified", "release_published", "release_rolled_back", "kill_switch_changed", "conflict_resolved"]),
  actor: authorSchema,
  subjectId: identifierSchema,
  timestamp: isoDateSchema,
  details: z.record(z.string().max(4_000)),
  previousHash: contentHashSchema.nullable(),
  entryHash: contentHashSchema,
}).strict();
