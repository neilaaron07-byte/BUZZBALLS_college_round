import type { DashboardData, DashboardPatch, DashboardTone } from "./dashboard-types";

export type PatchOperationKind = "style" | "attribute" | "content";
export type PatchDraftState = "draft" | "review" | "approved" | "blocked" | "archived";
export type ReviewDecision = "pending" | "approved" | "changes-requested";
export type ConflictDecision = "unresolved" | "keep-verified" | "archive-stale";

export type PatchOperation = {
  id: string;
  kind: PatchOperationKind;
  target: string;
  property: string;
  value: string;
  previousValue: string;
  inverseValue: string;
  allowlisted: boolean;
};

export type PatchDraft = {
  id: string;
  patchId: string;
  title: string;
  revision: number;
  author: string;
  target: { selector: string; fingerprint: string; label: string; confidence: number };
  operations: readonly PatchOperation[];
  inverseOperations: readonly PatchOperation[];
  state: PatchDraftState;
  review: { decision: ReviewDecision; reviewer: string | null; note: string | null };
  conflict: { decision: ConflictDecision; summary: string };
  preview: { status: "not-created" | "ready" | "expired"; expiresAt: string | null };
};

export type PatchValidation = {
  valid: boolean;
  tone: DashboardTone;
  status: "safe" | "review" | "blocked";
  checks: readonly PatchCheck[];
  nextAction: "review" | "preview" | "resolve-conflict" | "repair-operation" | "none";
};

export type PatchCheck = {
  id: string;
  label: string;
  tone: DashboardTone;
  passed: boolean;
  detail: string;
};

export type ReviewTimelineEvent = {
  id: string;
  type: "created" | "updated" | "previewed" | "reviewed" | "approved" | "changes-requested" | "conflict-resolved" | "archived";
  actor: string;
  timestamp: string;
  detail: string;
};

const allowedStyleProperties = new Set(["color", "background-color", "font-size", "font-weight"]);
const allowedAttributes = new Set(["aria-label", "data-testid"]);
const baseFingerprint = "sha256-" + "b".repeat(64);

function isHexColor(value: string): boolean {
  return /^#[0-9a-f]{6}$/i.test(value.trim());
}

function operationAllowed(operation: PatchOperation): boolean {
  if (operation.kind === "style") return allowedStyleProperties.has(operation.property) && (operation.property !== "color" || isHexColor(operation.value));
  if (operation.kind === "attribute") return allowedAttributes.has(operation.property) && operation.value.length <= 120;
  return operation.property === "textContent" && operation.value.trim().length > 0 && operation.value.length <= 500;
}

function operationInverse(operation: PatchOperation): PatchOperation {
  return { ...operation, id: `${operation.id}-inverse`, value: operation.previousValue, inverseValue: operation.value };
}

function patchTarget(): PatchDraft["target"] {
  return { selector: "p[data-product-price]", fingerprint: baseFingerprint, label: "Aurora price", confidence: .99 };
}

function defaultOperation(patch: DashboardPatch, value: string): PatchOperation {
  return { id: `${patch.id}-operation-1`, kind: "style", target: "p[data-product-price]", property: "color", value, previousValue: "#777777", inverseValue: "#777777", allowlisted: true };
}

function initialState(patch: DashboardPatch): PatchDraftState {
  if (["blocked", "rejected", "rolled_back"].includes(patch.status)) return "blocked";
  if (["verified", "approved", "canary-ready"].includes(patch.status)) return "approved";
  return "review";
}

export function buildPatchDraft(data: DashboardData, patch: DashboardPatch, value = "#132038"): PatchDraft {
  const operation = defaultOperation(patch, value);
  return {
    id: `draft_${patch.id}_r${patch.revision}`,
    patchId: patch.id,
    title: patch.title,
    revision: patch.revision,
    author: patch.author.name,
    target: patchTarget(),
    operations: [operation],
    inverseOperations: [operationInverse(operation)],
    state: initialState(patch),
    review: { decision: patch.status === "verified" ? "approved" : "pending", reviewer: patch.status === "verified" ? "Lena Ortiz" : null, note: null },
    conflict: { decision: data.workspace.stages.fix.counts.conflicts ? "unresolved" : "keep-verified", summary: data.workspace.stages.fix.counts.conflicts ? "A stale draft changes the same semantic price target." : "No overlapping operation is waiting for a decision." },
    preview: { status: "not-created", expiresAt: null },
  };
}

export function withOperationValue(draft: PatchDraft, value: string): PatchDraft {
  const existing = draft.operations[0];
  if (!existing) return draft;
  const operation = { ...existing, value, allowlisted: operationAllowed({ ...existing, value }) };
  return { ...draft, operations: [operation], inverseOperations: [operationInverse(operation)] };
}

export function setPreviewState(draft: PatchDraft, status: PatchDraft["preview"]["status"], expiresAt: string | null): PatchDraft {
  return { ...draft, preview: { status, expiresAt } };
}

export function validatePatchDraft(draft: PatchDraft): PatchValidation {
  const operationCount = draft.operations.length;
  const operation = draft.operations[0];
  const targetPassed = draft.target.confidence >= .9 && draft.target.fingerprint.startsWith("sha256-");
  const inversePassed = draft.inverseOperations.length === operationCount && Boolean(operation?.inverseValue);
  const propertiesPassed = draft.operations.every(operationAllowed);
  const conflictPassed = draft.conflict.decision !== "unresolved";
  const previewPassed = draft.preview.status === "ready";
  const checks: PatchCheck[] = [
    { id: "target", label: "Semantic target resolved", tone: targetPassed ? "green" : "red", passed: targetPassed, detail: targetPassed ? `${Math.round(draft.target.confidence * 100)}% confidence · ${draft.target.label}` : "The target fingerprint is not strong enough to edit safely." },
    { id: "operation", label: "Allowlisted operation", tone: propertiesPassed ? "green" : "red", passed: propertiesPassed, detail: propertiesPassed ? `${operationCount} constrained operation${operationCount === 1 ? "" : "s"} within the property allowlist.` : "The operation uses a property or value outside the safe allowlist." },
    { id: "inverse", label: "Inverse rollback attached", tone: inversePassed ? "green" : "red", passed: inversePassed, detail: inversePassed ? "The previous value can be restored without rebuilding the site." : "Every forward operation needs a signed inverse before preview." },
    { id: "conflict", label: "Conflict decision", tone: conflictPassed ? "green" : "amber", passed: conflictPassed, detail: conflictPassed ? "The overlapping draft has an explicit keep or archive decision." : "One overlapping draft still needs a human decision." },
    { id: "preview", label: "Private preview", tone: previewPassed ? "green" : "amber", passed: previewPassed, detail: previewPassed ? "The change has been applied in isolation." : "Preview the patch before asking for final approval." },
  ];
  const firstFailure = checks.find((check) => !check.passed);
  const nextAction: PatchValidation["nextAction"] = !propertiesPassed || !targetPassed || !inversePassed ? "repair-operation" : !conflictPassed ? "resolve-conflict" : !previewPassed ? "preview" : draft.review.decision === "approved" ? "none" : "review";
  const blocked = !targetPassed || !propertiesPassed || !inversePassed;
  return { valid: !firstFailure, tone: blocked ? "red" : firstFailure ? "amber" : "green", status: blocked ? "blocked" : firstFailure ? "review" : "safe", checks, nextAction };
}

export function patchStateLabel(state: PatchDraftState): string {
  return state === "approved" ? "Approved" : state === "review" ? "In review" : state === "blocked" ? "Blocked" : state === "archived" ? "Archived" : "Draft";
}

export function patchStateTone(state: PatchDraftState): DashboardTone {
  return state === "approved" ? "green" : state === "blocked" ? "red" : state === "archived" ? "red" : "amber";
}

export function reviewDecisionLabel(decision: ReviewDecision): string {
  return decision === "approved" ? "Approved" : decision === "changes-requested" ? "Changes requested" : "Awaiting review";
}

export function reviewDecisionTone(decision: ReviewDecision): DashboardTone {
  return decision === "approved" ? "green" : decision === "changes-requested" ? "red" : "amber";
}

export function applyReviewDecision(draft: PatchDraft, decision: ReviewDecision, reviewer: string, note: string): PatchDraft {
  const state: PatchDraftState = decision === "approved" ? "approved" : decision === "changes-requested" ? "blocked" : "review";
  return { ...draft, state, review: { decision, reviewer, note } };
}

export function applyConflictDecision(draft: PatchDraft, decision: Exclude<ConflictDecision, "unresolved">): PatchDraft {
  return { ...draft, conflict: { decision, summary: decision === "keep-verified" ? "Keep the verified operation and preserve its inverse." : "Archive the stale operation so it cannot re-enter the release." } };
}

export function patchNextAction(validation: PatchValidation, draft: PatchDraft): string {
  if (validation.nextAction === "repair-operation") return "Repair the constrained operation before preview.";
  if (validation.nextAction === "resolve-conflict") return "Resolve the overlapping draft before release review.";
  if (validation.nextAction === "preview") return "Open a private preview and inspect the patched route.";
  if (validation.nextAction === "review") return "Request a human review with the inverse operation attached.";
  return draft.review.decision === "approved" ? "Ready for browser verification." : "No further action is required.";
}

export function patchChecksByTone(validation: PatchValidation, tone: DashboardTone): PatchCheck[] {
  return validation.checks.filter((check) => check.tone === tone);
}

export function patchTimeline(draft: PatchDraft): ReviewTimelineEvent[] {
  const events: ReviewTimelineEvent[] = [
    { id: `${draft.id}-created`, type: "created", actor: draft.author, timestamp: "2026-10-10T07:34:00.000Z", detail: "Drafted from the Aurora contrast finding." },
    { id: `${draft.id}-updated`, type: "updated", actor: draft.author, timestamp: "2026-10-10T07:35:00.000Z", detail: `${draft.operations.length} constrained operation attached.` },
  ];
  if (draft.preview.status === "ready") events.push({ id: `${draft.id}-previewed`, type: "previewed", actor: draft.author, timestamp: "2026-10-10T07:36:00.000Z", detail: "Private preview created for the isolated route." });
  if (draft.review.decision !== "pending") events.push({ id: `${draft.id}-reviewed`, type: draft.review.decision === "approved" ? "approved" : "changes-requested", actor: draft.review.reviewer ?? "Reviewer", timestamp: "2026-10-10T07:38:00.000Z", detail: draft.review.note ?? reviewDecisionLabel(draft.review.decision) });
  if (draft.conflict.decision !== "unresolved") events.push({ id: `${draft.id}-conflict`, type: draft.conflict.decision === "keep-verified" ? "conflict-resolved" : "archived", actor: "Maya Singh", timestamp: "2026-10-10T07:39:00.000Z", detail: draft.conflict.summary });
  return events;
}

export function patchCsv(draft: PatchDraft, validation: PatchValidation): string {
  const columns = ["patchId", "revision", "target", "property", "value", "inverseValue", "state", "validation"] as const;
  const operation = draft.operations[0];
  const row = { patchId: draft.patchId, revision: draft.revision, target: draft.target.selector, property: operation?.property ?? "", value: operation?.value ?? "", inverseValue: operation?.inverseValue ?? "", state: patchStateLabel(draft.state), validation: validation.status };
  const escape = (value: string | number) => `"${String(value).replaceAll('"', '""')}"`;
  return [columns.join(","), columns.map((column) => escape(row[column])).join(",")].join("\n");
}

export function operationValueIsSafe(value: string): boolean {
  return isHexColor(value);
}

export function allowedPatchProperties(): readonly string[] {
  return [...allowedStyleProperties, ...allowedAttributes, "textContent"];
}
