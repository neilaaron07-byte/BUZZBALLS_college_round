import { z } from "zod";

export const identifierSchema = z.string().min(1).max(128).regex(/^[a-zA-Z0-9][a-zA-Z0-9._:-]*$/);
export const isoDateSchema = z.string().datetime({ offset: true });
export const contentHashSchema = z.string().regex(/^sha256-[a-f0-9]{64}$/);
export const environmentNameSchema = z.enum(["preview", "staging", "production"]);
export const lifecycleStatusSchema = z.enum(["draft", "review", "verified", "scheduled", "live", "rolled_back", "rejected"]);

export const authorSchema = z.object({
  id: identifierSchema,
  name: z.string().min(1).max(120),
  email: z.string().email().max(254),
  avatarUrl: z.string().url().optional(),
}).strict();

export const siteSchema = z.object({
  id: identifierSchema,
  name: z.string().min(1).max(120),
  canonicalOrigin: z.string().url().refine((value) => new URL(value).pathname === "/", "Site origin must not include a path."),
  repository: z.string().min(1).max(240),
  defaultBranch: z.string().min(1).max(120),
  createdAt: isoDateSchema,
  owner: authorSchema,
}).strict();

export const environmentSchema = z.object({
  id: identifierSchema,
  siteId: identifierSchema,
  name: environmentNameSchema,
  origin: z.string().url(),
  releaseId: identifierSchema.nullable(),
  protected: z.boolean(),
  createdAt: isoDateSchema,
}).strict();

export const killSwitchSchema = z.object({
  enabled: z.boolean(),
  reason: z.string().max(500).nullable(),
  enabledAt: isoDateSchema.nullable(),
  enabledBy: identifierSchema.nullable(),
}).strict();

export const manifestSchema = z.object({
  version: z.literal(1),
  siteId: identifierSchema,
  releaseId: identifierSchema,
  environment: environmentNameSchema,
  baseHash: contentHashSchema,
  patchHashes: z.array(contentHashSchema).max(500),
  createdAt: isoDateSchema,
  expiresAt: isoDateSchema,
  killSwitch: killSwitchSchema,
}).strict();

export const releaseSchema = z.object({
  id: identifierSchema,
  siteId: identifierSchema,
  environment: environmentNameSchema,
  version: z.string().min(1).max(80),
  title: z.string().min(1).max(160),
  summary: z.string().min(1).max(500),
  status: lifecycleStatusSchema,
  manifest: manifestSchema,
  author: authorSchema,
  createdAt: isoDateSchema,
  publishedAt: isoDateSchema.nullable(),
  rolledBackAt: isoDateSchema.nullable(),
}).strict();

export const patchIdentitySchema = z.object({
  id: identifierSchema,
  siteId: identifierSchema,
  targetFingerprint: z.string().min(16).max(512),
  createdBy: identifierSchema,
}).strict();

export const patchRevisionSchema = z.object({
  revision: z.number().int().positive(),
  baseManifestHash: contentHashSchema,
  contentHash: contentHashSchema,
  createdAt: isoDateSchema,
  author: authorSchema,
  message: z.string().min(1).max(500),
}).strict();

export type Author = z.infer<typeof authorSchema>;
export type Manifest = z.infer<typeof manifestSchema>;
export type Release = z.infer<typeof releaseSchema>;
