import { z } from "zod";
import { patchOperationSchema } from "../../core/src/index";
import { patchPilotActionToolNames, type EvidenceItem, type PatchPilotActionCard, type PatchPilotActionToolName, type PatchPilotContext, type PatchPilotDiffLine, type PatchProposal } from "./contracts";
import { redactText, sanitizePatchPilotContext } from "./redaction";

export const readOnlyPatchPilotTools = patchPilotActionToolNames.filter((name) => !["propose_patch", "propose_reanchor", "propose_conflict_resolution", "suggest_rollback_plan", "generate_release_notes", "draft_pr_description"].includes(name)) as readonly PatchPilotActionToolName[];
export const proposalPatchPilotTools = patchPilotActionToolNames.filter((name) => !readOnlyPatchPilotTools.includes(name)) as readonly PatchPilotActionToolName[];

export const actionToolInputSchema = z.object({
  context: z.record(z.unknown()),
  query: z.string().max(1_000).optional(),
  operation: patchOperationSchema.optional(),
}).strict();

export interface PatchPilotToolDescriptor {
  name: PatchPilotActionToolName;
  permission: "read" | "propose";
  description: string;
  mutates: false;
}

export const patchPilotToolCatalog: readonly PatchPilotToolDescriptor[] = [
  { name: "list_patches", permission: "read", description: "List patches visible in the current workspace context.", mutates: false },
  { name: "get_patch", permission: "read", description: "Read one patch, its inverse, review state, and evidence.", mutates: false },
  { name: "get_conflict", permission: "read", description: "Read a conflict and its two competing revisions.", mutates: false },
  { name: "get_verification_run", permission: "read", description: "Read replayable browser, visual, accessibility, console, and network checks.", mutates: false },
  { name: "get_release", permission: "read", description: "Read release gates, canary posture, and signed manifest evidence.", mutates: false },
  { name: "get_health", permission: "read", description: "Read observed health signals and rollback boundaries.", mutates: false },
  { name: "explain_resolver_result", permission: "read", description: "Explain winner, runner-up, confidence, and ambiguity in plain English.", mutates: false },
  { name: "propose_patch", permission: "propose", description: "Draft a typed patch with an inverse; never publishes it.", mutates: false },
  { name: "propose_reanchor", permission: "propose", description: "Draft a semantic re-anchor for human review; never applies it.", mutates: false },
  { name: "propose_conflict_resolution", permission: "propose", description: "Draft a conflict resolution choice for human review; never merges it.", mutates: false },
  { name: "suggest_rollback_plan", permission: "propose", description: "Describe a rollback plan for an owner to confirm; never rolls back.", mutates: false },
  { name: "summarize_activity", permission: "read", description: "Summarize measured activity and ownership context.", mutates: false },
  { name: "generate_release_notes", permission: "propose", description: "Draft release notes from verified changes; never publishes.", mutates: false },
  { name: "draft_pr_description", permission: "propose", description: "Draft a pull request description from evidence; never opens a PR.", mutates: false },
  { name: "search_audit", permission: "read", description: "Search the immutable audit chain for evidence and actors.", mutates: false },
];

const toolByName = new Map(patchPilotToolCatalog.map((tool) => [tool.name, tool]));

export function toolDescriptor(name: PatchPilotActionToolName): PatchPilotToolDescriptor {
  const tool = toolByName.get(name);
  if (!tool) throw new Error(`Unknown PatchPilot tool: ${name}`);
  return tool;
}

export function safeToolContext(context: PatchPilotContext): PatchPilotContext {
  return sanitizePatchPilotContext(context);
}

function cardEvidence(proposal: PatchProposal): readonly EvidenceItem[] {
  return proposal.evidence;
}

export function actionCardFromProposal(proposal: PatchProposal): PatchPilotActionCard {
  const operation = proposal.operation;
  const inverse = proposal.inverse ?? null;
  const diff: PatchPilotDiffLine[] = operation ? [{ label: `${operation.kind} · ${proposal.targetLabel}`, before: inverse ? "Current recorded value" : "Not supplied", after: "Proposed review value" }] : [];
  return { id: `action:${proposal.id}`, kind: "patch_proposal", status: proposal.status, title: proposal.status === "review" ? "Reviewable patch proposal" : "Patch proposal blocked", summary: redactText(proposal.explanation, 500), safe: proposal.status === "review", requiresHumanApproval: true, diff, operation, inverse, evidence: cardEvidence(proposal), actions: ["approve", "edit", "dismiss"] };
}

export function patchPilotCannotPublish(name: PatchPilotActionToolName): boolean {
  return !["publish", "rollback", "delete"].includes(name);
}
