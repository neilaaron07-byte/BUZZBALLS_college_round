import type { PatchOperation } from "../../../packages/core/src/index";
import type { ApiContext, ApiState } from "./types";
import { mergePatches, mergePreview, type MergeResult } from "./patch-merge";
import { findPatch, readState, updateState } from "./services";
import { ApiError } from "./errors";

export interface MergeRequest {
  leftPatchId: string;
  rightPatchId: string;
  authorId: string;
  message: string;
}

export async function previewMerge(context: ApiContext, leftPatchId: string, rightPatchId: string): Promise<MergeResult & { preview: ReturnType<typeof mergePreview> }> {
  const state = await readState(context);
  const result = mergePatches(state, leftPatchId, rightPatchId);
  return { ...result, preview: mergePreview(result) };
}

export async function applyCleanMerge(context: ApiContext, request: MergeRequest): Promise<{ status: "merged"; operations: readonly PatchOperation[]; message: string }> {
  const result = await previewMerge(context, request.leftPatchId, request.rightPatchId);
  if (result.status !== "clean") throw new ApiError(409, "MERGE_REQUIRES_REVIEW", result.explanation, result.conflicts);
  const state = await readState(context);
  const left = findPatch(state, request.leftPatchId);
  const right = findPatch(state, request.rightPatchId);
  if (!state.collaborators.some((collaborator) => collaborator.author.id === request.authorId)) throw new ApiError(403, "PERMISSION_DENIED", "Merge author is not a site collaborator.");
  await updateState(context, (current) => ({ ...current, patches: current.patches.map((patch) => patch.identity.id === left.identity.id ? { ...patch, operations: [...result.operations], description: `${patch.description} ${request.message}` } : patch) }), (current) => current);
  return { status: "merged", operations: result.operations, message: `Merged ${left.identity.id} with ${right.identity.id}.` };
}

export function mergePolicy(state: ApiState, leftPatchId: string, rightPatchId: string): { allowed: boolean; reason: string } {
  const left = state.patches.find((patch) => patch.identity.id === leftPatchId);
  const right = state.patches.find((patch) => patch.identity.id === rightPatchId);
  if (!left || !right) return { allowed: false, reason: "Both patches must be present." };
  if (left.identity.siteId !== right.identity.siteId) return { allowed: false, reason: "Patches must belong to the same site." };
  const result = mergePatches(state, leftPatchId, rightPatchId);
  return { allowed: result.status === "clean", reason: result.explanation };
}
