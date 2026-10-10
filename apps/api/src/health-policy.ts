import type { HealthEvent } from "../../../packages/core/src/index";
import type { ApiState } from "./types";

export interface HealthPolicy {
  maxErrorRate: number;
  maxLatencyMs: number;
  criticalAfterConsecutive: number;
  rollbackOnVisualRegression: boolean;
}

export interface HealthDecision {
  releaseId: string;
  status: "healthy" | "degraded" | "critical";
  score: number;
  consecutiveCritical: number;
  shouldRollback: boolean;
  reasons: readonly string[];
}

export const defaultHealthPolicy: HealthPolicy = { maxErrorRate: 2, maxLatencyMs: 600, criticalAfterConsecutive: 2, rollbackOnVisualRegression: true };

function eventIsCritical(event: HealthEvent, policy: HealthPolicy): boolean {
  if (event.status === "critical") return true;
  if (event.type === "error_rate" && event.value > policy.maxErrorRate) return true;
  if (event.type === "latency" && event.value > policy.maxLatencyMs) return true;
  return event.type === "visual_regression" && policy.rollbackOnVisualRegression && event.status === "degraded";
}

export function evaluateHealth(state: ApiState, releaseId: string, policy: HealthPolicy = defaultHealthPolicy): HealthDecision {
  const events = state.healthEvents.filter((event) => event.releaseId === releaseId).sort((left, right) => left.observedAt.localeCompare(right.observedAt));
  const latest = events.at(-1);
  let consecutiveCritical = 0;
  for (const event of [...events].reverse()) { if (!eventIsCritical(event, policy)) break; consecutiveCritical += 1; }
  const reasons = events.slice(-5).filter((event) => eventIsCritical(event, policy)).map((event) => event.explanation);
  const score = events.length === 0 ? 0 : Math.round(events.slice(-5).reduce((total, event) => total + (event.status === "healthy" ? 100 : event.status === "degraded" ? 65 : 20), 0) / Math.min(5, events.length));
  const status = consecutiveCritical >= policy.criticalAfterConsecutive ? "critical" : latest?.status === "degraded" ? "degraded" : latest?.status ?? "healthy";
  return { releaseId, status, score, consecutiveCritical, shouldRollback: status === "critical", reasons };
}

export function healthEventLabel(event: HealthEvent): string {
  return `${event.type.replaceAll("_", " ")} ${event.status}: ${event.value}${event.threshold === null ? "" : ` (threshold ${event.threshold})`}`;
}

export function healthWindow(events: readonly HealthEvent[], hours: number, now = new Date()): readonly HealthEvent[] {
  const cutoff = now.getTime() - Math.max(1, hours) * 3_600_000;
  return events.filter((event) => new Date(event.observedAt).getTime() >= cutoff);
}
