import type { Release } from "../../../packages/core/src/index";
import type { ApiState, RolloutState } from "./types";

export type RolloutPhase = "draft" | "canary" | "expanding" | "full" | "paused" | "rolled_back";

export interface RolloutEvent {
  id: string;
  releaseId: string;
  phase: RolloutPhase;
  percent: number;
  reason: string;
  occurredAt: string;
}

export interface RolloutDecision {
  allowed: boolean;
  phase: RolloutPhase;
  percent: number;
  headline: string;
  explanation: string;
  requiredSignals: readonly string[];
}

export function rolloutPhase(release: Release, rollout: RolloutState | null): RolloutPhase {
  if (release.status === "rolled_back") return "rolled_back";
  if (rollout?.killSwitch.enabled || rollout?.paused) return "paused";
  if (!rollout || rollout.canaryPercent === 0) return release.status === "draft" ? "draft" : "canary";
  if (rollout.canaryPercent >= 100) return "full";
  return rollout.canaryPercent >= 50 ? "expanding" : "canary";
}

export function decidePromotion(state: ApiState, releaseId: string, targetPercent: number): RolloutDecision {
  const release = state.releases.find((candidate) => candidate.id === releaseId);
  if (!release) return { allowed: false, phase: "draft", percent: 0, headline: "Release is missing", explanation: "PATCHWORK cannot promote a release that is not in the repository.", requiredSignals: ["release record"] };
  const rollout = state.rollouts.find((candidate) => candidate.releaseId === releaseId) ?? null;
  const phase = rolloutPhase(release, rollout);
  const latestHealth = state.healthEvents.filter((event) => event.releaseId === releaseId).at(-1);
  const latestVerification = state.verificationReports.find((report) => report.id.includes(releaseId));
  const requiredSignals = ["verified browser report", "healthy runtime event", "approved review"];
  if (phase === "rolled_back" || phase === "paused") return { allowed: false, phase, percent: rollout?.canaryPercent ?? 0, headline: "Promotion is paused", explanation: phase === "rolled_back" ? "This release has been rolled back and needs a new review cycle." : "A kill switch or pause is active; resume only after review.", requiredSignals };
  if (targetPercent > 25 && latestHealth?.status !== "healthy") return { allowed: false, phase, percent: rollout?.canaryPercent ?? 0, headline: "Health signal is not green", explanation: "PATCHWORK needs a recent healthy runtime event before expanding beyond the initial canary.", requiredSignals };
  if (targetPercent > 25 && latestVerification?.status !== "passed") return { allowed: false, phase, percent: rollout?.canaryPercent ?? 0, headline: "Verification is not green", explanation: "PATCHWORK will not promote without a stored passing verification report.", requiredSignals };
  const percent = Math.max(0, Math.min(100, targetPercent));
  return { allowed: true, phase: percent >= 100 ? "full" : percent >= 50 ? "expanding" : "canary", percent, headline: percent >= 100 ? "Ready for full rollout" : `Ready for ${percent}% rollout`, explanation: "The supplied release and runtime signals meet the promotion guard for this percentage.", requiredSignals };
}

export function releaseHealthScore(state: ApiState, releaseId: string): number {
  const events = state.healthEvents.filter((event) => event.releaseId === releaseId).slice(-10);
  if (events.length === 0) return 0;
  const values = events.map((event) => event.status === "healthy" ? 100 : event.status === "degraded" ? 65 : 20);
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

export function releaseDiff(state: ApiState, releaseId: string): { patchHashes: readonly string[]; patchCount: number; latestHealthScore: number; hasVerification: boolean } {
  const release = state.releases.find((candidate) => candidate.id === releaseId);
  if (!release) return { patchHashes: [], patchCount: 0, latestHealthScore: 0, hasVerification: false };
  return { patchHashes: release.manifest.patchHashes, patchCount: release.manifest.patchHashes.length, latestHealthScore: releaseHealthScore(state, releaseId), hasVerification: state.verificationReports.some((report) => report.id.includes(releaseId) && report.status === "passed") };
}
