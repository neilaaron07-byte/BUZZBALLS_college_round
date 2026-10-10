import type { AuditEntry } from "../../../packages/core/src/index";

export interface AuditIndex {
  bySubject: Readonly<Record<string, readonly number[]>>;
  byAction: Readonly<Record<string, readonly number[]>>;
  byActor: Readonly<Record<string, readonly number[]>>;
}

export function buildAuditIndex(entries: readonly AuditEntry[]): AuditIndex {
  const bySubject: Record<string, number[]> = {};
  const byAction: Record<string, number[]> = {};
  const byActor: Record<string, number[]> = {};
  for (const entry of entries) {
    bySubject[entry.subjectId] = [...(bySubject[entry.subjectId] ?? []), entry.sequence];
    byAction[entry.action] = [...(byAction[entry.action] ?? []), entry.sequence];
    byActor[entry.actor.id] = [...(byActor[entry.actor.id] ?? []), entry.sequence];
  }
  return { bySubject, byAction, byActor };
}

export function entriesForSubject(entries: readonly AuditEntry[], subjectId: string): readonly AuditEntry[] {
  return entries.filter((entry) => entry.subjectId === subjectId);
}

export function entriesInRange(entries: readonly AuditEntry[], from: Date | null, to: Date | null): readonly AuditEntry[] {
  return entries.filter((entry) => { const timestamp = new Date(entry.timestamp).getTime(); return (!from || timestamp >= from.getTime()) && (!to || timestamp <= to.getTime()); });
}

export function auditActivityCount(entries: readonly AuditEntry[], actorId: string, action: AuditEntry["action"]): number {
  return entries.filter((entry) => entry.actor.id === actorId && entry.action === action).length;
}
