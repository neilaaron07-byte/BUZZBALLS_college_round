import type { Patch, ScanFinding } from "../../../packages/core/src/index";
import type { ApiState } from "./types";
import { evaluatePatchPolicy } from "./patch-policy";
import { evaluatePatchApproval } from "./approval-policy";
import { publicPatch } from "./normalizers";

export interface PatchCatalogItem {
  patch: ReturnType<typeof publicPatch>;
  policy: ReturnType<typeof evaluatePatchPolicy>;
  approval: ReturnType<typeof evaluatePatchApproval>;
  linkedFindings: readonly ScanFinding[];
  linkedReleases: readonly string[];
  readiness: "ready" | "review" | "blocked";
}

function linkedFindings(state: ApiState, patch: Patch): readonly ScanFinding[] {
  return state.findings.filter((finding) => finding.targetIds.includes(patch.identity.id) || patch.operations.some((operation) => finding.targetIds.includes(operation.target.fallbackLabel)));
}

export function catalogPatch(state: ApiState, patch: Patch): PatchCatalogItem {
  const policy = evaluatePatchPolicy(state, patch);
  const approval = evaluatePatchApproval(state, patch);
  const linkedReleases = state.releases.filter((release) => release.manifest.patchHashes.includes(patch.revision.contentHash)).map((release) => release.id);
  const readiness = policy.status === "blocked" || approval.status === "blocked" ? "blocked" : policy.status === "warning" || approval.status === "warning" || patch.status === "draft" ? "review" : "ready";
  return { patch: publicPatch(patch, state.collaborators), policy, approval, linkedFindings: linkedFindings(state, patch), linkedReleases, readiness };
}

export function patchCatalog(state: ApiState, siteId: string): readonly PatchCatalogItem[] {
  return state.patches.filter((patch) => patch.identity.siteId === siteId).map((patch) => catalogPatch(state, patch));
}

export function patchStatusCounts(items: readonly PatchCatalogItem[]): Readonly<Record<"ready" | "review" | "blocked", number>> {
  return { ready: items.filter((item) => item.readiness === "ready").length, review: items.filter((item) => item.readiness === "review").length, blocked: items.filter((item) => item.readiness === "blocked").length };
}
