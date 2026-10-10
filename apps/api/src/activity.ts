import type { AuditEntry, HealthEvent, Release } from "../../../packages/core/src/index";
import type { ActivityItem, } from "./normalizers";
import type { ReviewRecord, ScanRunRecord } from "./types";

export interface ActivitySource {
  audits?: readonly AuditEntry[];
  scans?: readonly ScanRunRecord[];
  reviews?: readonly ReviewRecord[];
  health?: readonly HealthEvent[];
  releases?: readonly Release[];
}

export function mergeActivity(source: ActivitySource): ActivityItem[] {
  const items: ActivityItem[] = [];
  for (const entry of source.audits ?? []) items.push({ id: `audit-${entry.id}`, timestamp: entry.timestamp, type: "audit", title: entry.action.replaceAll("_", " "), detail: entry.details.message ?? "Audit event recorded.", severity: entry.action === "release_rolled_back" ? "critical" : "info", subjectId: entry.subjectId });
  for (const scan of source.scans ?? []) items.push({ id: `scan-${scan.id}`, timestamp: scan.finishedAt ?? scan.startedAt, type: "scan", title: "Website scan completed", detail: scan.summary, severity: scan.status === "failed" ? "critical" : scan.findingIds.length > 0 ? "warning" : "info", subjectId: scan.id });
  for (const review of source.reviews ?? []) items.push({ id: `review-${review.id}`, timestamp: review.createdAt, type: "review", title: `Patch ${review.decision.replaceAll("_", " ")}`, detail: review.note, severity: review.decision === "rejected" ? "critical" : review.decision === "changes_requested" ? "warning" : "info", subjectId: review.patchId });
  for (const event of source.health ?? []) items.push({ id: `health-${event.id}`, timestamp: event.observedAt, type: "health", title: `Runtime health ${event.status}`, detail: event.explanation, severity: event.status === "critical" ? "critical" : event.status === "degraded" ? "warning" : "info", subjectId: event.releaseId });
  return items.sort((left, right) => right.timestamp.localeCompare(left.timestamp));
}

export function activityWindow(items: readonly ActivityItem[], from: string | undefined, to: string | undefined): readonly ActivityItem[] {
  const lower = from ? new Date(from).getTime() : Number.NEGATIVE_INFINITY;
  const upper = to ? new Date(to).getTime() : Number.POSITIVE_INFINITY;
  return items.filter((item) => { const timestamp = new Date(item.timestamp).getTime(); return timestamp >= lower && timestamp <= upper; });
}
