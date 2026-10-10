import type { ApiState } from "./types";
import { inspectState, type RepairReport } from "./state-repair";
import { metricsSnapshot, type MetricsSnapshot } from "./metrics";

export interface ApiHealthReport {
  status: "ok" | "degraded" | "blocked";
  metrics: MetricsSnapshot;
  repository: RepairReport;
  explanations: readonly string[];
}

export async function apiHealth(state: ApiState, volatile: { requests: number; errors: number; idempotentReplays: number; bytesRejected: number }): Promise<ApiHealthReport> {
  const repository = await inspectState(state);
  const metrics = metricsSnapshot(state, volatile);
  const explanations: string[] = [];
  if (metrics.errorRatePercent > 5) explanations.push("HTTP error rate is above five percent.");
  if (repository.issues.length > 0) explanations.push(...repository.issues.map((issue) => issue.explanation));
  return { status: !repository.healthy ? "blocked" : metrics.errorRatePercent > 5 ? "degraded" : "ok", metrics, repository, explanations };
}

export function readyConditions(state: ApiState): readonly { id: string; ready: boolean; explanation: string }[] {
  return [
    { id: "seed", ready: state.sites.length > 0, explanation: state.sites.length > 0 ? "At least one site is loaded." : "No site is loaded." },
    { id: "release", ready: state.releases.some((release) => release.status === "live"), explanation: state.releases.some((release) => release.status === "live") ? "A live release is available." : "No live release is available." },
    { id: "audit", ready: state.auditEntries.length > 0, explanation: state.auditEntries.length > 0 ? "Audit chain has seeded entries." : "Audit chain is empty." },
  ];
}
