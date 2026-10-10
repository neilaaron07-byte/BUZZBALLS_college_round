import { verifyChain } from "../../../packages/core/src/index";
import type { ApiState } from "./types";
import { checkStateInvariants } from "./workflow";

export interface RepairIssue {
  id: string;
  severity: "warning" | "blocking";
  explanation: string;
  repairable: boolean;
}

export interface RepairReport {
  healthy: boolean;
  issues: readonly RepairIssue[];
  counts: { sites: number; patches: number; releases: number; auditEntries: number };
}

export async function inspectState(state: ApiState): Promise<RepairReport> {
  const issues: RepairIssue[] = [];
  for (const invariant of checkStateInvariants(state)) if (invariant.status === "failed") issues.push({ id: invariant.id, severity: "blocking", explanation: invariant.explanation, repairable: false });
  const audit = await verifyChain(state.auditEntries);
  if (!audit.valid) issues.push({ id: "audit-chain", severity: "blocking", explanation: audit.reason, repairable: false });
  const duplicatePatchIds = state.patches.map((patch) => patch.identity.id).filter((id, index, values) => values.indexOf(id) !== index);
  if (duplicatePatchIds.length > 0) issues.push({ id: "duplicate-patches", severity: "blocking", explanation: `Duplicate patch ids: ${[...new Set(duplicatePatchIds)].join(", ")}.`, repairable: false });
  const staleRollouts = state.rollouts.filter((rollout) => !state.releases.some((release) => release.id === rollout.releaseId));
  if (staleRollouts.length > 0) issues.push({ id: "stale-rollouts", severity: "warning", explanation: `${staleRollouts.length} rollout record${staleRollouts.length === 1 ? "" : "s"} points to a missing release.`, repairable: true });
  const stalePreviews = state.previews.filter((preview) => !state.patches.some((patch) => patch.identity.id === preview.patchId));
  if (stalePreviews.length > 0) issues.push({ id: "stale-previews", severity: "warning", explanation: `${stalePreviews.length} preview record${stalePreviews.length === 1 ? "" : "s"} points to a missing patch.`, repairable: true });
  return { healthy: issues.every((issue) => issue.severity !== "blocking"), issues, counts: { sites: state.sites.length, patches: state.patches.length, releases: state.releases.length, auditEntries: state.auditEntries.length } };
}

export function repairState(state: ApiState): ApiState {
  const releaseIds = new Set(state.releases.map((release) => release.id));
  const patchIds = new Set(state.patches.map((patch) => patch.identity.id));
  return { ...state, rollouts: state.rollouts.filter((rollout) => releaseIds.has(rollout.releaseId)), previews: state.previews.filter((preview) => patchIds.has(preview.patchId)) };
}

export function repairSummary(report: RepairReport): string {
  return report.healthy ? report.issues.length === 0 ? "Repository checks passed with no repairable issues." : `${report.issues.length} non-blocking issue${report.issues.length === 1 ? "" : "s"} can be repaired safely.` : `${report.issues.length} issue${report.issues.length === 1 ? "" : "s"} require attention before release.`;
}
