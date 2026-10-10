import { z } from "zod";
import type { Conflict, PatchOperation, ResolverCandidate, ResolverResult, ScanFinding, ScanSnapshot, SemanticFingerprint } from "../../core/src/index";

export const patchPilotIntentSchema = z.enum(["scan", "explain", "suggest", "summarize", "draft"]);
export type PatchPilotIntent = z.infer<typeof patchPilotIntentSchema>;

export const responseStatusSchema = z.enum(["green", "amber", "red"]);
export type ResponseStatus = z.infer<typeof responseStatusSchema>;

export interface EvidenceItem {
  id: string;
  source: "scanner" | "resolver" | "verification" | "health" | "release";
  text: string;
}

export interface VerificationSignal {
  status: "passed" | "warning" | "blocked";
  score: number;
  failedChecks: number;
  warningChecks: number;
  summary: string;
}

export interface HealthSignal {
  score: number;
  errorRatePercent: number;
  latencyMs: number;
  sdkFailures: number;
  observedHoursAgo: number;
}

export interface PatchPilotContext {
  pageUrl: string;
  findings?: readonly ScanFinding[];
  conflicts?: readonly Conflict[];
  snapshot?: ScanSnapshot;
  target?: SemanticFingerprint;
  candidates?: readonly ResolverCandidate[];
  resolution?: ResolverResult;
  verification?: VerificationSignal;
  health?: HealthSignal;
  releaseAgeHours?: number;
}

export interface ConfidenceSummary {
  score: number;
  status: ResponseStatus;
  label: "high" | "medium" | "low";
  explanation: string;
}

export interface NextAction {
  label: string;
  reason: string;
  safe: boolean;
}

export interface PatchProposal {
  id: string;
  status: "review" | "blocked";
  operation: PatchOperation | null;
  targetLabel: string;
  confidence: ConfidenceSummary;
  explanation: string;
  nextAction: NextAction;
  autoApproved: false;
  evidence: readonly EvidenceItem[];
  inverse?: PatchOperation | null;
}

export type PatchPilotActionKind = "patch_proposal" | "reanchor_proposal" | "conflict_resolution" | "rollback_plan" | "release_notes" | "pr_description";

export interface PatchPilotDiffLine {
  label: string;
  before: string;
  after: string;
}

export interface PatchPilotActionCard {
  id: string;
  kind: PatchPilotActionKind;
  status: "review" | "blocked";
  title: string;
  summary: string;
  safe: boolean;
  requiresHumanApproval: true;
  diff: readonly PatchPilotDiffLine[];
  operation: PatchOperation | null;
  inverse: PatchOperation | null;
  evidence: readonly EvidenceItem[];
  actions: readonly ["approve", "edit", "dismiss"];
}

export interface BlastRadiusNarrative {
  status: ResponseStatus;
  headline: string;
  detail: string;
  affectedElements: number;
  affectedPages: number;
  affectedViewports: number;
  evidence: readonly EvidenceItem[];
}

export interface HealthNarrative {
  status: ResponseStatus;
  score: number;
  headline: string;
  detail: string;
  nextAction: NextAction;
  evidence: readonly EvidenceItem[];
}

export interface PatchPilotResponse {
  intent: PatchPilotIntent;
  status: ResponseStatus;
  headline: string;
  answer: string;
  confidence: ConfidenceSummary;
  nextAction: NextAction;
  evidence: readonly EvidenceItem[];
  proposal?: PatchProposal;
  blastRadius?: BlastRadiusNarrative;
  health?: HealthNarrative;
}

export interface PatchPilotRequest {
  intent: PatchPilotIntent;
  context: PatchPilotContext;
  question?: string;
}

export interface PatchPilotProvider {
  readonly name: string;
  complete(request: PatchPilotRequest): Promise<PatchPilotResponse>;
}

export interface OptionalProviderAdapter {
  readonly name: string;
  complete(request: PatchPilotRequest): Promise<unknown>;
  normalize(response: unknown, request: PatchPilotRequest): PatchPilotResponse;
}

export interface PatchPilotOptions {
  now?: () => Date;
  provider?: OptionalProviderAdapter;
}

export type ToolName = "scan" | "explain" | "suggest" | "summarize" | "draft";

export const patchPilotActionToolNames = [
  "list_patches",
  "get_patch",
  "get_conflict",
  "get_verification_run",
  "get_release",
  "get_health",
  "explain_resolver_result",
  "propose_patch",
  "propose_reanchor",
  "propose_conflict_resolution",
  "suggest_rollback_plan",
  "summarize_activity",
  "generate_release_notes",
  "draft_pr_description",
  "search_audit",
] as const;

export type PatchPilotActionToolName = (typeof patchPilotActionToolNames)[number];
