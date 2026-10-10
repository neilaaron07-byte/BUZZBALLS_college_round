import type { ApiState } from "./types";
import { activityFromState, type ActivityItem } from "./normalizers";
import { paginate, type Page } from "./query";
import { ApiError } from "./errors";

export type TimelineStage = "scan" | "fix" | "ship";
export type TimelineTone = "green" | "amber" | "red";

export interface TimelineEvent extends ActivityItem {
  cursor: string;
  stage: TimelineStage;
  tone: TimelineTone;
  action: string;
  plainEnglish: string;
}

export interface TimelineFilters {
  query: string | undefined;
  stage: TimelineStage | undefined;
  tone: TimelineTone | undefined;
  from: string | undefined;
  to: string | undefined;
  limit: number;
  cursor: string | undefined;
}

export interface TimelinePage extends Page<TimelineEvent> {
  filters: TimelineFilters;
  summary: { total: number; green: number; amber: number; red: number; latestAt: string | null };
}

const stageForType: Readonly<Record<ActivityItem["type"], TimelineStage>> = { finding: "scan", scan: "scan", review: "fix", audit: "fix", health: "ship" };

function toneForActivity(item: ActivityItem): TimelineTone {
  return item.severity === "critical" ? "red" : item.severity === "warning" ? "amber" : "green";
}

function normalizeDate(value: string | undefined, label: string): string | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new ApiError(400, "INVALID_TIMELINE_DATE", `${label} must be an ISO date.`);
  return date.toISOString();
}

export function parseTimelineFilters(query: Record<string, unknown>): TimelineFilters {
  const stage = typeof query.stage === "string" && ["scan", "fix", "ship"].includes(query.stage) ? query.stage as TimelineStage : undefined;
  const tone = typeof query.tone === "string" && ["green", "amber", "red"].includes(query.tone) ? query.tone as TimelineTone : undefined;
  if (typeof query.stage === "string" && !stage) throw new ApiError(400, "INVALID_TIMELINE_STAGE", "stage must be scan, fix, or ship.");
  if (typeof query.tone === "string" && !tone) throw new ApiError(400, "INVALID_TIMELINE_TONE", "tone must be green, amber, or red.");
  const rawLimit = query.limit === undefined ? 20 : Number(query.limit);
  if (!Number.isInteger(rawLimit) || rawLimit < 1 || rawLimit > 100) throw new ApiError(400, "INVALID_TIMELINE_LIMIT", "limit must be an integer between 1 and 100.");
  return { query: typeof query.q === "string" ? query.q.trim().toLocaleLowerCase("en-US") || undefined : undefined, stage, tone, from: normalizeDate(typeof query.from === "string" ? query.from : undefined, "from"), to: normalizeDate(typeof query.to === "string" ? query.to : undefined, "to"), limit: rawLimit, cursor: typeof query.cursor === "string" ? query.cursor : undefined };
}

export function timelineCursor(item: Pick<ActivityItem, "timestamp" | "id">): string {
  return `${item.timestamp}::${item.id}`;
}

function plainEnglish(item: ActivityItem, stage: TimelineStage): string {
  if (item.type === "finding") return `SCAN found a risk: ${item.detail}`;
  if (item.type === "review") return `FIX recorded a human review: ${item.detail}`;
  if (item.type === "health") return `SHIP observed a release signal: ${item.detail}`;
  if (item.type === "scan") return `SCAN completed evidence collection: ${item.detail}`;
  return `${stage.toUpperCase()} recorded this change: ${item.detail}`;
}

export function toTimelineEvent(item: ActivityItem): TimelineEvent {
  const stage = stageForType[item.type];
  const tone = toneForActivity(item);
  return { ...item, cursor: timelineCursor(item), stage, tone, action: item.title, plainEnglish: plainEnglish(item, stage) };
}

function matchesDate(event: TimelineEvent, filters: TimelineFilters): boolean {
  return (!filters.from || event.timestamp >= filters.from) && (!filters.to || event.timestamp <= filters.to);
}

function matchesText(event: TimelineEvent, query: string | undefined): boolean {
  if (!query) return true;
  return `${event.title} ${event.detail} ${event.subjectId} ${event.plainEnglish}`.toLocaleLowerCase("en-US").includes(query);
}

export function filterTimeline(items: readonly TimelineEvent[], filters: TimelineFilters): TimelineEvent[] {
  return items.filter((event) => (!filters.stage || event.stage === filters.stage) && (!filters.tone || event.tone === filters.tone) && matchesDate(event, filters) && matchesText(event, filters.query)).sort((left, right) => right.cursor.localeCompare(left.cursor));
}

export function timelineSummary(items: readonly TimelineEvent[]): TimelinePage["summary"] {
  return { total: items.length, green: items.filter((item) => item.tone === "green").length, amber: items.filter((item) => item.tone === "amber").length, red: items.filter((item) => item.tone === "red").length, latestAt: items[0]?.timestamp ?? null };
}

export function buildTimeline(state: ApiState, siteId: string, rawQuery: Record<string, unknown> = {}): TimelinePage {
  const filters = parseTimelineFilters(rawQuery);
  const all = activityFromState(state, siteId).map(toTimelineEvent);
  const filtered = filterTimeline(all, filters);
  const page = paginate(filtered, { cursor: filters.cursor, limit: filters.limit, direction: "desc" }, (item) => item.cursor);
  return { ...page, filters, summary: timelineSummary(filtered) };
}

export function timelineCsvRows(events: readonly TimelineEvent[]): readonly (readonly (string | number | boolean | null)[])[] {
  return [
    ["timestamp", "stage", "tone", "action", "subject", "explanation"],
    ...events.map((event) => [event.timestamp, event.stage, event.tone, event.action, event.subjectId, event.plainEnglish]),
  ];
}

export function timelineHasCritical(events: readonly TimelineEvent[]): boolean {
  return events.some((event) => event.tone === "red");
}

export function timelineStageCounts(events: readonly TimelineEvent[]): Readonly<Record<TimelineStage, number>> {
  return { scan: events.filter((event) => event.stage === "scan").length, fix: events.filter((event) => event.stage === "fix").length, ship: events.filter((event) => event.stage === "ship").length };
}
