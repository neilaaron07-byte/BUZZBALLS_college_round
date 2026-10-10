import { canonicalJson } from "./canonical";
import { conflictSchema, type Conflict } from "./evidence";
import type { PatchOperation } from "./operations";
import type { Patch } from "./patches";

const MANIFEST_TARGET = "manifest-root-000000";

export function operationPropertyKey(operation: PatchOperation): string {
  switch (operation.kind) {
    case "style": return `${operation.target.fingerprint}::style:${operation.property}`;
    case "text": return `${operation.target.fingerprint}::text`;
    case "attribute": return `${operation.target.fingerprint}::attribute:${operation.name}`;
    case "hide": return `${operation.target.fingerprint}::hide`;
    case "reorder": return `${operation.target.fingerprint}::reorder`;
    case "badge": return `${operation.target.fingerprint}::badge`;
  }
}

function baseConflict(patchId: string, kind: Conflict["kind"], targetFingerprint: string, explanation: string, suggestedResolution: string, severity: Conflict["severity"] = "blocking"): Conflict {
  return conflictSchema.parse({
    id: `conflict_${patchId}_${kind}_${targetFingerprint.slice(0, 8)}`,
    patchId,
    kind,
    severity,
    targetFingerprint,
    explanation,
    suggestedResolution,
    leftRevision: null,
    rightRevision: null,
    resolvedAt: null,
    resolvedBy: null,
  });
}

export function detectDirectPropertyConflicts(left: Patch, right: Patch): readonly Conflict[] {
  const rightByKey = new Map(right.operations.map((operation) => [operationPropertyKey(operation), operation]));
  const conflicts: Conflict[] = [];
  for (const leftOperation of left.operations) {
    const rightOperation = rightByKey.get(operationPropertyKey(leftOperation));
    if (rightOperation && canonicalJson(leftOperation) !== canonicalJson(rightOperation)) {
      conflicts.push(baseConflict(left.identity.id, "property", leftOperation.target.fingerprint, `Both revisions change the same ${leftOperation.kind} property on “${leftOperation.target.fallbackLabel}”.`, "Review the two values and keep one explicit operation."));
    }
  }
  return conflicts;
}

export function detectSemanticConflicts(left: Patch, right: Patch): readonly Conflict[] {
  const conflicts: Conflict[] = [];
  const leftByTarget = new Map(left.operations.map((operation) => [operation.target.fingerprint, operation]));
  for (const rightOperation of right.operations) {
    const leftOperation = leftByTarget.get(rightOperation.target.fingerprint);
    if (!leftOperation) continue;
    const hideStyle = (leftOperation.kind === "hide" && rightOperation.kind === "style") || (leftOperation.kind === "style" && rightOperation.kind === "hide");
    if (hideStyle) conflicts.push(baseConflict(left.identity.id, "hide_style", rightOperation.target.fingerprint, `One revision hides “${rightOperation.target.fallbackLabel}” while the other changes its appearance.`, "Decide whether the element should remain visible before merging.", "blocking"));
    if (leftOperation.kind === "reorder" && rightOperation.kind === "reorder" && (leftOperation.direction !== rightOperation.direction || leftOperation.siblingFingerprint !== rightOperation.siblingFingerprint)) {
      conflicts.push(baseConflict(left.identity.id, "reorder", rightOperation.target.fingerprint, `The two revisions move “${rightOperation.target.fallbackLabel}” to different places.`, "Choose one destination and verify the surrounding structure.", "blocking"));
    }
  }
  return conflicts;
}

export function detectStaleManifestConflict(left: Patch, right: Patch): readonly Conflict[] {
  if (left.revision.baseManifestHash === right.revision.baseManifestHash) return [];
  return [baseConflict(left.identity.id, "stale_manifest", MANIFEST_TARGET, "These revisions were created from different base manifests, so their target evidence cannot be merged blindly.", "Re-scan the current release and rebase the older patch before review.")];
}

export function detectDependencyConflicts(patches: readonly Patch[]): readonly Conflict[] {
  const byId = new Map(patches.map((patch) => [patch.identity.id, patch]));
  const conflicts: Conflict[] = [];
  for (const patch of patches) {
    for (const dependency of patch.dependencies) {
      if (!byId.has(dependency)) conflicts.push(baseConflict(patch.identity.id, "dependency", `dependency-${patch.identity.id}`, `Patch “${patch.title}” depends on “${dependency}”, but that patch is not in the release.`, "Add the missing dependency or remove the dependency edge."));
    }
  }
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const walk = (patch: Patch): void => {
    if (visited.has(patch.identity.id)) return;
    if (visiting.has(patch.identity.id)) {
      conflicts.push(baseConflict(patch.identity.id, "dependency", `dependency-${patch.identity.id}`, `Patch “${patch.title}” participates in a dependency cycle.`, "Break the cycle so every patch has a one-way review order."));
      return;
    }
    visiting.add(patch.identity.id);
    for (const dependency of patch.dependencies) {
      const next = byId.get(dependency);
      if (next) walk(next);
    }
    visiting.delete(patch.identity.id);
    visited.add(patch.identity.id);
  };
  for (const patch of patches) walk(patch);
  return conflicts;
}

export function detectConflicts(left: Patch, right: Patch, allPatches: readonly Patch[] = [left, right]): readonly Conflict[] {
  return [
    ...detectDirectPropertyConflicts(left, right),
    ...detectSemanticConflicts(left, right),
    ...detectStaleManifestConflict(left, right),
    ...detectDependencyConflicts(allPatches),
  ];
}
