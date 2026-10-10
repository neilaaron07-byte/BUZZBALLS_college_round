import type { HealthEvent } from "../../../packages/core/src/index";
import type { ApiContext, ApiState } from "./types";
import { evaluateHealth, healthEventLabel, healthWindow, type HealthPolicy } from "./health-policy";
import { updateState } from "./services";

export interface HealthOverview {
  releaseId: string;
  current: ReturnType<typeof evaluateHealth>;
  recent: readonly (HealthEvent & { label: string })[];
  byType: Readonly<Record<HealthEvent["type"], number>>;
}

const eventTypes: readonly HealthEvent["type"][] = ["request_rate", "error_rate", "latency", "visual_regression", "browser_check", "kill_switch"];

export function healthOverview(state: ApiState, releaseId: string, policy?: HealthPolicy, now = new Date()): HealthOverview {
  const events = healthWindow(state.healthEvents.filter((event) => event.releaseId === releaseId), 24, now);
  const byType = Object.fromEntries(eventTypes.map((type) => [type, events.filter((event) => event.type === type).length])) as Record<HealthEvent["type"], number>;
  return { releaseId, current: evaluateHealth(state, releaseId, policy), recent: events.map((event) => ({ ...event, label: healthEventLabel(event) })), byType };
}

export async function acknowledgeHealth(context: ApiContext, eventId: string): Promise<HealthEvent> {
  return updateState(context, (state) => { const event = state.healthEvents.find((candidate) => candidate.id === eventId); if (!event) throw new Error("Health event was not found."); return state; }, (state) => state.healthEvents.find((event) => event.id === eventId) as HealthEvent);
}

export function healthStatusLabel(status: HealthEvent["status"]): string {
  return status === "healthy" ? "Within policy" : status === "degraded" ? "Needs review" : "Rollback threshold";
}
