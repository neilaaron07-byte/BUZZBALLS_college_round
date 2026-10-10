import { z } from "zod";
import { authorSchema, contentHashSchema, identifierSchema, isoDateSchema, lifecycleStatusSchema, patchIdentitySchema, patchRevisionSchema } from "./schemas";
import { patchOperationSchema } from "./operations";

export const patchSchema = z.object({
  identity: patchIdentitySchema,
  revision: patchRevisionSchema,
  title: z.string().min(1).max(160),
  description: z.string().min(1).max(2_000),
  status: lifecycleStatusSchema,
  operations: z.array(patchOperationSchema).min(1).max(100),
  dependencies: z.array(identifierSchema).max(50),
  reviewers: z.array(authorSchema).max(20),
  tags: z.array(z.string().min(1).max(40)).max(20),
  createdAt: isoDateSchema,
  updatedAt: isoDateSchema,
}).strict();

export const patchBundleSchema = z.object({
  schemaVersion: z.literal(1),
  contentHash: contentHashSchema,
  patches: z.array(patchSchema).min(1).max(100),
}).strict();

export type Patch = z.infer<typeof patchSchema>;
