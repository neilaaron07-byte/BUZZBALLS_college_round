import { z } from "zod";
import type { Conflict, PatchOperation, ScanFinding, ScanSnapshot, SemanticFingerprint } from "../../core/src/index";
import type { BlastRadiusNarrative, HealthSignal, PatchPilotContext, PatchProposal, ToolName } from "./contracts";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isScanSnapshot(value: unknown): value is ScanSnapshot {
  if (!isRecord(value) || typeof value.pageUrl !== "string" || !isRecord(value.viewport) || !Array.isArray(value.elements)) return false;
  return typeof value.viewport.width === "number" && typeof value.viewport.height === "number";
}

function isFinding(value: unknown): value is ScanFinding {
  return isRecord(value) && typeof value.id === "string" && typeof value.summary === "string" && Array.isArray(value.targetIds) && typeof value.confidence === "number";
}

function isConflict(value: unknown): value is Conflict {
  return isRecord(value) && typeof value.id === "string" && typeof value.kind === "string" && typeof value.explanation === "string";
}

const contextSchema = z.object({ pageUrl: z.string().url(), findings: z.array(z.custom<ScanFinding>(isFinding)).optional(), conflicts: z.array(z.custom<Conflict>(isConflict)).optional() }).strict();

export const scanToolSchema = z.object({ snapshot: z.custom<ScanSnapshot>(isScanSnapshot, "A serializable page snapshot is required.") }).strict();
export const explainToolSchema = z.object({ finding: z.custom<ScanFinding>(isFinding, "A typed scanner finding is required."), question: z.string().max(500).optional() }).strict();
export const suggestToolSchema = z.object({ finding: z.custom<ScanFinding>(isFinding), target: z.custom<SemanticFingerprint>((value) => isRecord(value) && typeof value.tag === "string"), context: contextSchema }).strict();
export const summarizeToolSchema = z.object({ context: z.custom<PatchPilotContext>((value) => isRecord(value) && typeof value.pageUrl === "string"), verification: z.custom<HealthSignal | undefined>(() => true).optional() }).strict();
export const draftToolSchema = z.object({ proposal: z.custom<PatchProposal>((value) => isRecord(value) && typeof value.id === "string"), operation: z.custom<PatchOperation | null>(() => true).nullable() }).strict();

export interface ToolInputMap {
  scan: z.infer<typeof scanToolSchema>;
  explain: z.infer<typeof explainToolSchema>;
  suggest: z.infer<typeof suggestToolSchema>;
  summarize: z.infer<typeof summarizeToolSchema>;
  draft: z.infer<typeof draftToolSchema>;
}

export interface ToolOutputMap {
  scan: readonly ScanFinding[];
  explain: string;
  suggest: PatchProposal;
  summarize: BlastRadiusNarrative;
  draft: PatchProposal;
}

export const toolSchemas: Readonly<Record<ToolName, z.ZodTypeAny>> = {
  scan: scanToolSchema,
  explain: explainToolSchema,
  suggest: suggestToolSchema,
  summarize: summarizeToolSchema,
  draft: draftToolSchema,
};

export function parseToolInput<TName extends ToolName>(name: TName, input: unknown): ToolInputMap[TName] {
  const schema = toolSchemas[name] as z.ZodType<ToolInputMap[TName]>;
  return schema.parse(input);
}
