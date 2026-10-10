import { z } from "zod";
import { identifierSchema } from "./schemas";

const targetAttributesSchema = z.object({
  id: z.string().optional(),
  testId: z.string().optional(),
  name: z.string().optional(),
  role: z.string().optional(),
  ariaLabel: z.string().optional(),
  hrefPattern: z.string().optional(),
  meaningfulClasses: z.array(z.string()).max(30),
}).strict();

export const targetEvidenceSchema = z.object({
  version: z.literal(1),
  tag: z.string().min(1).max(40),
  attributes: targetAttributesSchema,
  normalizedText: z.string().max(2_000),
  textTokens: z.array(z.string().max(120)).max(200),
  textNgrams: z.array(z.string().max(240)).max(200),
  path: z.array(z.string().max(120)).max(50),
  siblingSignature: z.array(z.string().max(120)).max(50),
  landmarkChain: z.array(z.string().max(120)).max(30),
  region: z.enum(["top-left", "top-center", "top-right", "middle-left", "middle-center", "middle-right", "bottom-left", "bottom-center", "bottom-right"]),
  visualRole: z.enum(["button", "link", "input", "heading", "navigation", "card", "media", "text", "unknown"]),
}).strict();

export const cssPropertySchema = z.enum([
  "backgroundColor",
  "color",
  "borderColor",
  "borderRadius",
  "boxShadow",
  "display",
  "fontFamily",
  "fontSize",
  "fontWeight",
  "gap",
  "height",
  "letterSpacing",
  "lineHeight",
  "margin",
  "maxWidth",
  "minHeight",
  "opacity",
  "padding",
  "textAlign",
  "textDecoration",
  "transform",
  "visibility",
  "width",
  "zIndex",
]);

export const targetSelectorSchema = z.object({
  fingerprint: z.string().min(16).max(512),
  fallbackLabel: z.string().min(1).max(120),
  expectedTag: z.string().min(1).max(40).regex(/^[a-z][a-z0-9-]*$/),
  expectedRole: z.string().max(80).optional(),
  evidence: targetEvidenceSchema.optional(),
}).strict();

const operationBase = z.object({
  id: identifierSchema,
  target: targetSelectorSchema,
}).strict();

export const styleOperationSchema = operationBase.extend({
  kind: z.literal("style"),
  property: cssPropertySchema,
  value: z.string().min(1).max(500),
});

export const textOperationSchema = operationBase.extend({
  kind: z.literal("text"),
  value: z.string().max(2_000),
});

export const attributeOperationSchema = operationBase.extend({
  kind: z.literal("attribute"),
  name: z.enum(["aria-label", "aria-describedby", "data-testid", "id", "title", "role", "href"]),
  value: z.string().max(1_000),
});

export const hideOperationSchema = operationBase.extend({
  kind: z.literal("hide"),
  hidden: z.boolean(),
});

export const reorderOperationSchema = operationBase.extend({
  kind: z.literal("reorder"),
  direction: z.enum(["before", "after"]),
  siblingFingerprint: z.string().min(16).max(512),
});

export const badgeOperationSchema = operationBase.extend({
  kind: z.literal("badge"),
  label: z.string().min(1).max(80),
  tone: z.enum(["neutral", "info", "success", "warning", "danger"]),
});

export const patchOperationSchema = z.discriminatedUnion("kind", [
  styleOperationSchema,
  textOperationSchema,
  attributeOperationSchema,
  hideOperationSchema,
  reorderOperationSchema,
  badgeOperationSchema,
]);

export type PatchOperation = z.infer<typeof patchOperationSchema>;
