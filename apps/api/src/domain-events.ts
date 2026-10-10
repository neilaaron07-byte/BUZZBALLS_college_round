import type { Conflict, Patch, Release, ScanFinding } from "../../../packages/core/src/index";
import type { ApiState } from "./types";

export type DomainEventName = "finding_opened" | "patch_created" | "patch_verified" | "release_live" | "release_rolled_back" | "conflict_opened" | "health_degraded";

export interface DomainEvent {
  id: string;
  name: DomainEventName;
  subjectId: string;
  occurredAt: string;
  payload: Readonly<Record<string, string | number | boolean>>;
}

export function eventForFinding(finding: ScanFinding, occurredAt: string): DomainEvent { return { id: `event_${finding.id}`, name: "finding_opened", subjectId: finding.id, occurredAt, payload: { severity: finding.severity, confidence: finding.confidence } }; }
export function eventForPatch(patch: Patch): DomainEvent { return { id: `event_${patch.identity.id}`, name: patch.status === "verified" ? "patch_verified" : "patch_created", subjectId: patch.identity.id, occurredAt: patch.updatedAt, payload: { revision: patch.revision.revision, operations: patch.operations.length } }; }
export function eventForRelease(release: Release): DomainEvent { return { id: `event_${release.id}`, name: release.status === "rolled_back" ? "release_rolled_back" : "release_live", subjectId: release.id, occurredAt: release.publishedAt ?? release.createdAt, payload: { environment: release.environment, status: release.status } }; }
export function eventForConflict(conflict: Conflict): DomainEvent { return { id: `event_${conflict.id}`, name: "conflict_opened", subjectId: conflict.id, occurredAt: conflict.resolvedAt ?? new Date().toISOString(), payload: { kind: conflict.kind, severity: conflict.severity } }; }

export function domainEvents(state: ApiState): DomainEvent[] {
  return [...state.findings.map((finding) => eventForFinding(finding, state.scanRuns.find((scan) => scan.findingIds.includes(finding.id))?.finishedAt ?? finding.id)), ...state.patches.map(eventForPatch), ...state.releases.map(eventForRelease), ...state.conflicts.filter((conflict) => !conflict.resolvedAt).map(eventForConflict)].sort((left, right) => right.occurredAt.localeCompare(left.occurredAt));
}

export function eventCounts(events: readonly DomainEvent[]): Readonly<Record<DomainEventName, number>> {
  const names: readonly DomainEventName[] = ["finding_opened", "patch_created", "patch_verified", "release_live", "release_rolled_back", "conflict_opened", "health_degraded"];
  return Object.fromEntries(names.map((name) => [name, events.filter((event) => event.name === name).length])) as Record<DomainEventName, number>;
}
