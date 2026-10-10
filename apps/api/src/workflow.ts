import type { Conflict, Patch, Release } from "../../../packages/core/src/index";
import type { ApiState, ScanRunRecord } from "./types";

export type WorkflowEntity = "patch" | "release" | "scan";

const patchTransitions: Readonly<Record<Patch["status"], readonly Patch["status"][]>> = {
  draft: ["review", "rejected"],
  review: ["draft", "verified", "rejected"],
  verified: ["scheduled", "rejected"],
  scheduled: ["live", "rolled_back", "rejected"],
  live: ["rolled_back"],
  rolled_back: ["draft", "review"],
  rejected: ["draft"],
};

const releaseTransitions: Readonly<Record<Release["status"], readonly Release["status"][]>> = {
  draft: ["review", "rejected"],
  review: ["verified", "rejected"],
  verified: ["scheduled", "rejected"],
  scheduled: ["live", "rolled_back", "rejected"],
  live: ["scheduled", "rolled_back"],
  rolled_back: ["draft", "review"],
  rejected: ["draft"],
};

const scanTransitions: Readonly<Record<ScanRunRecord["status"], readonly ScanRunRecord["status"][]>> = {
  queued: ["running", "failed"],
  running: ["completed", "failed"],
  completed: [],
  failed: ["queued", "running"],
};

export function canTransition<T extends string>(map: Readonly<Record<T, readonly T[]>>, from: T, to: T): boolean {
  return from === to || map[from].includes(to);
}

export function assertPatchTransition(from: Patch["status"], to: Patch["status"]): void {
  if (!canTransition(patchTransitions, from, to)) throw new Error(`Patch cannot transition from ${from} to ${to}.`);
}

export function assertReleaseTransition(from: Release["status"], to: Release["status"]): void {
  if (!canTransition(releaseTransitions, from, to)) throw new Error(`Release cannot transition from ${from} to ${to}.`);
}

export function assertScanTransition(from: ScanRunRecord["status"], to: ScanRunRecord["status"]): void {
  if (!canTransition(scanTransitions, from, to)) throw new Error(`Scan cannot transition from ${from} to ${to}.`);
}

export interface StateInvariant {
  id: string;
  status: "passed" | "failed";
  explanation: string;
}

export function checkStateInvariants(state: ApiState): readonly StateInvariant[] {
  const siteIds = new Set(state.sites.map((site) => site.id));
  const releaseIds = new Set(state.releases.map((release) => release.id));
  const patchIds = new Set(state.patches.map((patch) => patch.identity.id));
  const checks: StateInvariant[] = [
    { id: "site-references", status: state.environments.every((environment) => siteIds.has(environment.siteId)) ? "passed" : "failed", explanation: "Every environment points to a known site." },
    { id: "release-references", status: state.environments.every((environment) => environment.releaseId === null || releaseIds.has(environment.releaseId)) ? "passed" : "failed", explanation: "Every environment release reference is known." },
    { id: "patch-references", status: state.reviews.every((review) => patchIds.has(review.patchId)) ? "passed" : "failed", explanation: "Every review points to a known patch." },
    { id: "rollout-references", status: state.rollouts.every((rollout) => releaseIds.has(rollout.releaseId)) ? "passed" : "failed", explanation: "Every rollout points to a known release." },
    { id: "conflict-references", status: state.conflicts.every((conflict) => patchIds.has(conflict.patchId)) ? "passed" : "failed", explanation: "Every conflict points to a known patch." },
  ];
  return checks;
}

export function dependentPatches(state: ApiState, patchId: string): readonly Patch[] {
  return state.patches.filter((patch) => patch.dependencies.includes(patchId));
}

export function unresolvedConflictsFor(state: ApiState, patchIds: ReadonlySet<string>): readonly Conflict[] {
  return state.conflicts.filter((conflict) => patchIds.has(conflict.patchId) && conflict.resolvedAt === null);
}
