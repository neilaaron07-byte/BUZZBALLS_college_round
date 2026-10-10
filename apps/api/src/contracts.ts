import { z } from "zod";
import { identifierSchema, patchOperationSchema } from "../../../packages/core/src/index";

export const paginationSchema = z.object({
  cursor: z.string().max(200).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  sort: z.string().max(80).optional(),
  direction: z.enum(["asc", "desc"]).default("desc"),
}).strict();

export const scanRequestSchema = z.object({
  siteId: identifierSchema,
  pageUrl: z.string().url(),
  snapshot: z.object({
    pageUrl: z.string().url(),
    viewport: z.object({ width: z.number().int().positive(), height: z.number().int().positive() }).strict(),
    elements: z.array(z.object({
      id: identifierSchema,
      tag: z.string().min(1).max(40),
      role: z.string().max(80).optional(),
      text: z.string().max(2_000),
      accessibleName: z.string().max(500).optional(),
      href: z.string().max(2_000).optional(),
      linkStatus: z.number().int().optional(),
      visible: z.boolean(),
      region: z.string().max(60),
      rect: z.object({ left: z.number(), top: z.number(), right: z.number(), bottom: z.number() }).strict(),
      styles: z.object({ foreground: z.string().max(80).optional(), background: z.string().max(80).optional(), fontSizePx: z.number().positive().optional(), fontWeight: z.number().positive().optional() }).strict().optional(),
    }).strict()).max(5_000),
  }).strict(),
}).strict();

export const patchCreateRequestSchema = z.object({
  id: identifierSchema.optional(),
  siteId: identifierSchema,
  authorId: identifierSchema,
  title: z.string().min(1).max(160),
  description: z.string().min(1).max(2_000),
  message: z.string().min(1).max(500).optional(),
  targetFingerprint: z.string().min(16).max(512),
  operations: z.array(patchOperationSchema).min(1).max(100),
  dependencies: z.array(identifierSchema).max(50).default([]),
  reviewers: z.array(identifierSchema).max(20).default([]),
  tags: z.array(z.string().min(1).max(40)).max(20).default([]),
}).strict();

export const revisionCreateRequestSchema = z.object({
  authorId: identifierSchema,
  baseRevision: z.number().int().positive(),
  message: z.string().min(1).max(500),
  operations: z.array(patchOperationSchema).min(1).max(100),
}).strict();

export const reviewRequestSchema = z.object({
  authorId: identifierSchema,
  decision: z.enum(["approved", "rejected", "changes_requested"]),
  note: z.string().min(1).max(1_000),
}).strict();

export const collaboratorRequestSchema = z.object({
  authorId: identifierSchema,
  role: z.enum(["owner", "editor", "reviewer", "viewer"]),
}).strict();

export const releasePolicySchema = z.object({
  requireVerification: z.boolean().default(true),
  blockOnCriticalFinding: z.boolean().default(true),
  maxCanaryPercent: z.number().int().min(1).max(100).default(25),
  requireApprovalCount: z.number().int().min(1).max(20).default(1),
}).strict();

export const releaseActionSchema = z.object({
  authorId: identifierSchema.optional(),
  reason: z.string().max(500).optional(),
  percent: z.number().int().min(0).max(100).optional(),
}).strict();

export const healthEventRequestSchema = z.object({
  id: identifierSchema,
  releaseId: identifierSchema,
  type: z.enum(["request_rate", "error_rate", "latency", "visual_regression", "browser_check", "kill_switch"]),
  status: z.enum(["healthy", "degraded", "critical"]),
  observedAt: z.string().datetime({ offset: true }),
  value: z.number().finite(),
  threshold: z.number().finite().nullable(),
  explanation: z.string().min(1).max(1_000),
}).strict();

export const storedReportRequestSchema = z.object({ report: z.unknown() }).strict();

export const liveSiteTargetSchema = z.object({
  siteId: identifierSchema,
  pageUrl: z.string().url().max(2_048),
  ownership: z.object({
    verified: z.boolean().default(false),
    ownerName: z.string().min(1).max(120).optional(),
  }).strict().default({ verified: false }),
  runtime: z.object({
    installed: z.boolean().default(false),
    version: z.string().max(80).optional(),
    connectedOrigin: z.string().url().max(2_048).optional(),
  }).strict().default({ installed: false }),
  scanPolicy: z.object({
    allowPaths: z.array(z.string().min(1).max(200)).max(50).default(["/"]),
    denyPaths: z.array(z.string().min(1).max(200)).max(50).default([]),
    maxBytes: z.number().int().min(32_000).max(1_000_000).default(512_000),
    timeoutMs: z.number().int().min(1_000).max(15_000).default(8_000),
  }).strict().default({ allowPaths: ["/"], denyPaths: [], maxBytes: 512_000, timeoutMs: 8_000 }),
}).strict();

export const liveScanRequestSchema = liveSiteTargetSchema.extend({
  viewport: z.object({ width: z.number().int().min(320).max(2_880), height: z.number().int().min(480).max(2_880) }).strict().default({ width: 1_440, height: 900 }),
}).strict();

export function parseLimit(value: unknown, fallback = 25): number {
  const parsed = z.coerce.number().int().min(1).max(100).safeParse(value);
  return parsed.success ? parsed.data : fallback;
}

export function parsePolicy(input: unknown): z.infer<typeof releasePolicySchema> {
  return releasePolicySchema.parse(input ?? {});
}

export type PatchCreateRequest = z.infer<typeof patchCreateRequestSchema>;
export type RevisionCreateRequest = z.infer<typeof revisionCreateRequestSchema>;
export type ReviewRequest = z.infer<typeof reviewRequestSchema>;
export type ReleasePolicy = z.infer<typeof releasePolicySchema>;
export type LiveSiteTarget = z.infer<typeof liveSiteTargetSchema>;
export type LiveScanRequest = z.infer<typeof liveScanRequestSchema>;
