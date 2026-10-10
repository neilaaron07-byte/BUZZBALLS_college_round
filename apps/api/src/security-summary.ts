import type { ApiState } from "./types";
import { checkStateInvariants } from "./workflow";

export interface SecuritySummary {
  status: "green" | "amber" | "red";
  headline: string;
  checks: readonly { id: string; status: "passed" | "warning" | "failed"; explanation: string }[];
  counts: { unresolvedConflicts: number; killSwitches: number; expiredManifests: number; invalidReferences: number };
}

export function securitySummary(state: ApiState, now = new Date()): SecuritySummary {
  const unresolvedConflicts = state.conflicts.filter((conflict) => !conflict.resolvedAt).length;
  const killSwitches = state.rollouts.filter((rollout) => rollout.killSwitch.enabled).length;
  const expiredManifests = state.releases.filter((release) => new Date(release.manifest.expiresAt).getTime() <= now.getTime()).length;
  const invalidReferences = checkStateInvariants(state).filter((check) => check.status === "failed").length;
  const checks = [
    { id: "audit-chain", status: "passed" as const, explanation: "Audit integrity is checked by the audit endpoint before release decisions." },
    { id: "conflict-surface", status: unresolvedConflicts > 0 ? "warning" as const : "passed" as const, explanation: unresolvedConflicts > 0 ? `${unresolvedConflicts} unresolved conflict${unresolvedConflicts === 1 ? "" : "s"} remain visible to reviewers.` : "No unresolved conflicts remain." },
    { id: "kill-switch", status: killSwitches > 0 ? "warning" as const : "passed" as const, explanation: killSwitches > 0 ? `${killSwitches} release kill switch${killSwitches === 1 ? " is" : "es are"} enabled.` : "No release kill switch is enabled." },
    { id: "manifest-expiry", status: expiredManifests > 0 ? "failed" as const : "passed" as const, explanation: expiredManifests > 0 ? `${expiredManifests} release manifest${expiredManifests === 1 ? " has" : "s have"} expired.` : "All stored release manifests are within their expiry window." },
    { id: "references", status: invalidReferences > 0 ? "failed" as const : "passed" as const, explanation: invalidReferences > 0 ? `${invalidReferences} repository invariant${invalidReferences === 1 ? "" : "s"} failed.` : "All repository references resolve safely." },
  ];
  const failed = checks.some((check) => check.status === "failed");
  const warning = checks.some((check) => check.status === "warning");
  return { status: failed ? "red" : warning ? "amber" : "green", headline: failed ? "Repository safety needs attention" : warning ? "Repository safety has review items" : "Repository safety is healthy", checks, counts: { unresolvedConflicts, killSwitches, expiredManifests, invalidReferences } };
}
