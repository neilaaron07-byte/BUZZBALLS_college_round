import { randomUUID } from "node:crypto";
import type { ScanSnapshot } from "../../../packages/core/src/index";
import type { ApiState, ScanRunRecord } from "./types";

export interface ScheduledScan {
  id: string;
  siteId: string;
  pageUrl: string;
  frequency: "manual" | "hourly" | "daily";
  nextRunAt: string;
  enabled: boolean;
  createdAt: string;
}

export interface ScanScheduleDecision {
  due: boolean;
  reason: string;
  nextRunAt: string;
}

function addFrequency(date: Date, frequency: ScheduledScan["frequency"]): Date {
  if (frequency === "hourly") return new Date(date.getTime() + 3_600_000);
  if (frequency === "daily") return new Date(date.getTime() + 86_400_000);
  return new Date(date.getTime());
}

export function createSchedule(siteId: string, pageUrl: string, frequency: ScheduledScan["frequency"], now = new Date()): ScheduledScan {
  return { id: `schedule_${randomUUID().replaceAll("-", "").slice(0, 12)}`, siteId, pageUrl, frequency, nextRunAt: addFrequency(now, frequency).toISOString(), enabled: true, createdAt: now.toISOString() };
}

export function scheduleDecision(schedule: ScheduledScan, now = new Date()): ScanScheduleDecision {
  const due = schedule.enabled && schedule.frequency !== "manual" && new Date(schedule.nextRunAt).getTime() <= now.getTime();
  return { due, reason: !schedule.enabled ? "Schedule is disabled." : schedule.frequency === "manual" ? "Manual scans do not run from a clock." : due ? "Schedule is due." : "Next run is still in the future.", nextRunAt: schedule.nextRunAt };
}

export function advanceSchedule(schedule: ScheduledScan, now = new Date()): ScheduledScan {
  return { ...schedule, nextRunAt: addFrequency(now, schedule.frequency).toISOString() };
}

export function lastScanForUrl(state: ApiState, siteId: string, pageUrl: string): ScanRunRecord | null {
  return [...state.scanRuns].filter((scan) => scan.siteId === siteId && scan.pageUrl === pageUrl).sort((left, right) => (right.finishedAt ?? right.startedAt).localeCompare(left.finishedAt ?? left.startedAt))[0] ?? null;
}

export function snapshotStillMatches(snapshot: ScanSnapshot, pageUrl: string): boolean {
  return snapshot.pageUrl === pageUrl && snapshot.viewport.width > 0 && snapshot.viewport.height > 0;
}
