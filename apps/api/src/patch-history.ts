import type { Patch } from "../../../packages/core/src/index";
import type { ApiState, PatchRevisionRecord } from "./types";

export interface RevisionDiff {
  patchId: string;
  fromRevision: number;
  toRevision: number;
  addedOperations: readonly string[];
  removedOperations: readonly string[];
  changedMessage: boolean;
  summary: string;
}

export interface PatchHistory {
  patch: Patch;
  revisions: readonly PatchRevisionRecord[];
  diffs: readonly RevisionDiff[];
  authors: readonly string[];
}

function operationKey(operation: Patch["operations"][number]): string {
  return `${operation.kind}:${operation.target.fingerprint}:${"property" in operation ? operation.property : "name" in operation ? operation.name : "direction" in operation ? operation.direction : operation.kind}`;
}

export function diffRevisions(patch: Patch, previous: PatchRevisionRecord, next: PatchRevisionRecord, previousOperations: readonly Patch["operations"][number][], nextOperations: readonly Patch["operations"][number][]): RevisionDiff {
  const before = new Set(previousOperations.map(operationKey));
  const after = new Set(nextOperations.map(operationKey));
  const addedOperations = [...after].filter((key) => !before.has(key));
  const removedOperations = [...before].filter((key) => !after.has(key));
  return { patchId: patch.identity.id, fromRevision: previous.revision, toRevision: next.revision, addedOperations, removedOperations, changedMessage: previous.message !== next.message, summary: addedOperations.length === 0 && removedOperations.length === 0 ? "Revision changes copy or metadata only." : `${addedOperations.length} operation${addedOperations.length === 1 ? "" : "s"} added and ${removedOperations.length} removed.` };
}

export function patchHistory(state: ApiState, patchId: string): PatchHistory | null {
  const patch = state.patches.find((candidate) => candidate.identity.id === patchId);
  if (!patch) return null;
  const revisions = state.patchRevisions.filter((revision) => revision.patchId === patchId).sort((left, right) => left.revision - right.revision);
  const diffs: RevisionDiff[] = [];
  for (let index = 1; index < revisions.length; index += 1) { const previous = revisions[index - 1]; const next = revisions[index]; if (previous && next) diffs.push(diffRevisions(patch, previous, next, patch.operations, patch.operations)); }
  return { patch, revisions, diffs, authors: [...new Set(revisions.map((revision) => revision.authorId))] };
}

export function revisionStatus(revision: PatchRevisionRecord, currentRevision: number): "current" | "superseded" {
  return revision.revision === currentRevision ? "current" : "superseded";
}
