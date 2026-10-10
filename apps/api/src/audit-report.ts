import { verifyChain, type AuditEntry } from "../../../packages/core/src/index";
import { toCsv } from "./normalizers";
import type { ApiState } from "./types";

export interface AuditReport {
  valid: boolean;
  totalEntries: number;
  firstTimestamp: string | null;
  lastTimestamp: string | null;
  actors: readonly { id: string; name: string; eventCount: number }[];
  actions: Readonly<Record<AuditEntry["action"], number>>;
  reason: string;
}

const actionNames: readonly AuditEntry["action"][] = ["patch_created", "patch_reviewed", "patch_verified", "release_published", "release_rolled_back", "kill_switch_changed", "conflict_resolved"];

export async function buildAuditReport(state: ApiState): Promise<AuditReport> {
  const chain = await verifyChain(state.auditEntries);
  const actions = Object.fromEntries(actionNames.map((action) => [action, state.auditEntries.filter((entry) => entry.action === action).length])) as Record<AuditEntry["action"], number>;
  const actorMap = new Map<string, { id: string; name: string; eventCount: number }>();
  for (const entry of state.auditEntries) {
    const current = actorMap.get(entry.actor.id) ?? { id: entry.actor.id, name: entry.actor.name, eventCount: 0 };
    actorMap.set(entry.actor.id, { ...current, eventCount: current.eventCount + 1 });
  }
  return { valid: chain.valid, totalEntries: state.auditEntries.length, firstTimestamp: state.auditEntries[0]?.timestamp ?? null, lastTimestamp: state.auditEntries.at(-1)?.timestamp ?? null, actors: [...actorMap.values()].sort((left, right) => right.eventCount - left.eventCount), actions, reason: chain.reason };
}

export function auditCsv(entries: readonly AuditEntry[]): string {
  return toCsv([["sequence", "id", "action", "actor", "subject", "timestamp", "previousHash", "entryHash", "message"], ...entries.map((entry) => [entry.sequence, entry.id, entry.action, `${entry.actor.name} <${entry.actor.email}>`, entry.subjectId, entry.timestamp, entry.previousHash, entry.entryHash, entry.details.message ?? ""])]) + "\n";
}

export function tamperPreview(entries: readonly AuditEntry[]): { original: number; altered: number; changedId: string | null } {
  const first = entries[0];
  if (!first) return { original: 0, altered: 0, changedId: null };
  return { original: first.entryHash.length, altered: `${first.entryHash}:tampered`.length, changedId: first.id };
}

export function summarizeAuditActors(report: AuditReport): string {
  if (report.actors.length === 0) return "No audit events have been recorded.";
  return report.actors.map((actor) => `${actor.name}: ${actor.eventCount} event${actor.eventCount === 1 ? "" : "s"}`).join("; ");
}

export function auditDownloadName(siteId: string, now = new Date()): string {
  return `${siteId}-audit-${now.toISOString().slice(0, 10)}.csv`;
}
