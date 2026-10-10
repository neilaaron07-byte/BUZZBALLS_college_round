import type { PatchOperation } from "../../../packages/core/src/index";
import type { ApiState } from "./types";

export interface MergeConflict {
  targetFingerprint: string;
  leftOperation: string;
  rightOperation: string;
  explanation: string;
}

export interface MergeResult {
  status: "clean" | "review" | "blocked";
  operations: readonly PatchOperation[];
  conflicts: readonly MergeConflict[];
  explanation: string;
}

function propertyFor(operation: PatchOperation): string {
  if (operation.kind === "style") return operation.property;
  if (operation.kind === "attribute") return operation.name;
  if (operation.kind === "text") return "text";
  if (operation.kind === "hide") return "hidden";
  if (operation.kind === "reorder") return "order";
  return "badge";
}

function operationKey(operation: PatchOperation): string {
  return `${operation.target.fingerprint}:${propertyFor(operation)}`;
}

export function mergeOperations(left: readonly PatchOperation[], right: readonly PatchOperation[]): MergeResult {
  const conflicts: MergeConflict[] = [];
  const leftByKey = new Map(left.map((operation) => [operationKey(operation), operation]));
  const merged = [...left];
  for (const operation of right) {
    const key = operationKey(operation);
    const existing = leftByKey.get(key);
    if (!existing) { merged.push(operation); continue; }
    if (JSON.stringify(existing) === JSON.stringify(operation)) continue;
    conflicts.push({ targetFingerprint: operation.target.fingerprint, leftOperation: propertyFor(existing), rightOperation: propertyFor(operation), explanation: `Both revisions change ${propertyFor(operation)} on the same semantic target.` });
  }
  return { status: conflicts.length === 0 ? "clean" : conflicts.some((conflict) => conflict.leftOperation === "hidden" || conflict.rightOperation === "hidden") ? "blocked" : "review", operations: merged, conflicts, explanation: conflicts.length === 0 ? "The operation sets merge without overlapping property changes." : `${conflicts.length} overlapping operation${conflicts.length === 1 ? "" : "s"} need human review.` };
}

export function mergePatches(state: ApiState, leftId: string, rightId: string): MergeResult {
  const left = state.patches.find((patch) => patch.identity.id === leftId);
  const right = state.patches.find((patch) => patch.identity.id === rightId);
  if (!left || !right) return { status: "blocked", operations: [], conflicts: [], explanation: "Both patches must exist before a merge can be proposed." };
  if (left.identity.siteId !== right.identity.siteId) return { status: "blocked", operations: [], conflicts: [], explanation: "Patches from different sites cannot be merged." };
  return mergeOperations(left.operations, right.operations);
}

export function mergePreview(result: MergeResult): { safe: boolean; operationCount: number; conflictCount: number } {
  return { safe: result.status === "clean", operationCount: result.operations.length, conflictCount: result.conflicts.length };
}
