import type { Release } from "../../../packages/core/src/index";
import type { ApiState } from "./types";
import { decidePromotion, rolloutPhase } from "./release-controller";

export interface ReleaseSchedule {
  id: string;
  releaseId: string;
  environment: Release["environment"];
  startsAt: string;
  endsAt: string | null;
  status: "scheduled" | "active" | "completed" | "cancelled";
  createdBy: string;
}

export interface ReleaseScheduleDecision {
  scheduleId: string;
  action: "wait" | "start" | "complete" | "cancel";
  explanation: string;
}

export function decideSchedule(state: ApiState, schedule: ReleaseSchedule, now = new Date()): ReleaseScheduleDecision {
  const release = state.releases.find((candidate) => candidate.id === schedule.releaseId);
  if (!release) return { scheduleId: schedule.id, action: "cancel", explanation: "The scheduled release no longer exists." };
  if (schedule.status === "cancelled" || schedule.status === "completed") return { scheduleId: schedule.id, action: "wait", explanation: "Schedule is already terminal." };
  if (new Date(schedule.startsAt).getTime() > now.getTime()) return { scheduleId: schedule.id, action: "wait", explanation: "The release window has not started." };
  const rollout = state.rollouts.find((candidate) => candidate.releaseId === release.id) ?? null;
  const phase = rolloutPhase(release, rollout);
  if (phase === "paused" || phase === "rolled_back") return { scheduleId: schedule.id, action: "cancel", explanation: "Release controls are paused or rolled back." };
  if (schedule.endsAt && new Date(schedule.endsAt).getTime() <= now.getTime()) return { scheduleId: schedule.id, action: "complete", explanation: "Release window has ended." };
  const promotion = decidePromotion(state, release.id, rollout?.canaryPercent ?? 25);
  return promotion.allowed ? { scheduleId: schedule.id, action: "start", explanation: promotion.explanation } : { scheduleId: schedule.id, action: "wait", explanation: promotion.explanation };
}

export function scheduleWindow(startsAt: string, endsAt: string | null): { valid: boolean; durationMinutes: number | null } {
  const start = new Date(startsAt).getTime();
  const end = endsAt ? new Date(endsAt).getTime() : null;
  if (Number.isNaN(start) || (end !== null && Number.isNaN(end)) || (end !== null && end <= start)) return { valid: false, durationMinutes: null };
  return { valid: true, durationMinutes: end === null ? null : Math.round((end - start) / 60_000) };
}
