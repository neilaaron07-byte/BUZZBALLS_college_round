import type { Release } from "../../../packages/core/src/index";
import type { ApiState } from "./types";
import { releaseSafety } from "./release-safety";
import { evaluateReleasePolicy } from "./policies";
import { evaluateReleaseApprovals } from "./approval-policy";

export type ReleaseCommand = "publish" | "promote" | "pause" | "rollback" | "kill_switch";

export interface ReleaseCommandResult {
  command: ReleaseCommand;
  allowed: boolean;
  status: "green" | "amber" | "red";
  releaseId: string;
  explanation: string;
  checks: readonly { id: string; status: "passed" | "warning" | "failed"; explanation: string }[];
}

export async function authorizeReleaseCommand(state: ApiState, release: Release, command: ReleaseCommand): Promise<ReleaseCommandResult> {
  const checks: { id: string; status: "passed" | "warning" | "failed"; explanation: string }[] = [];
  const safety = await releaseSafety(state, release.id);
  const policy = evaluateReleasePolicy(state, release);
  const approvals = evaluateReleaseApprovals(state, release);
  checks.push(...(safety?.policy.checks ?? []));
  checks.push({ id: "approval", status: approvals.status === "blocked" ? "failed" : approvals.status === "warning" ? "warning" : "passed", explanation: approvals.explanation });
  if (command === "rollback") return { command, allowed: release.status === "live" || release.status === "scheduled", status: release.status === "live" ? "amber" : "red", releaseId: release.id, explanation: release.status === "live" ? "Rollback is available and will restore the previous named release." : "Only a live or scheduled release can be rolled back.", checks };
  if (command === "kill_switch") return { command, allowed: true, status: "amber", releaseId: release.id, explanation: "Kill switch changes are always explicit and audited.", checks };
  const blocked = policy.status === "blocked" || approvals.status === "blocked" || safety?.status === "red";
  return { command, allowed: !blocked, status: blocked ? "red" : policy.status === "warning" || approvals.status === "warning" ? "amber" : "green", releaseId: release.id, explanation: blocked ? "Release policy or integrity evidence blocks this command." : command === "promote" ? "Release can move to the next rollout stage." : command === "pause" ? "Release can be paused for review." : "Release is eligible to publish.", checks };
}

export function commandLabel(command: ReleaseCommand): string {
  return command === "kill_switch" ? "toggle the kill switch" : command.replaceAll("_", " ");
}

export function commandRequiresConfirmation(command: ReleaseCommand): boolean {
  return command === "rollback" || command === "kill_switch" || command === "promote";
}
