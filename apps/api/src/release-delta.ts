import { buildReleaseReadiness, type ReadinessTone, type ReleaseReadiness } from "./release-readiness";
import type { ApiState } from "./types";

export type DeltaKind = "added" | "removed" | "changed" | "unchanged";

export interface ReleaseDeltaItem {
  id: string;
  label: string;
  kind: DeltaKind;
  current: string | number | boolean | null;
  candidate: string | number | boolean | null;
  explanation: string;
}

export interface ReleaseDelta {
  current: ReleaseReadiness["release"];
  candidate: ReleaseReadiness["release"];
  generatedAt: string;
  tone: ReadinessTone;
  scoreDelta: number;
  improved: boolean;
  summary: string;
  items: readonly ReleaseDeltaItem[];
  changedCount: number;
  blockedCount: number;
}

function kindFor(current: string | number | boolean | null, candidate: string | number | boolean | null): DeltaKind {
  if (current === null && candidate !== null) return "added";
  if (current !== null && candidate === null) return "removed";
  return current === candidate ? "unchanged" : "changed";
}

function item(id: string, label: string, current: string | number | boolean | null, candidate: string | number | boolean | null, explanation: string): ReleaseDeltaItem {
  return { id, label, current, candidate, kind: kindFor(current, candidate), explanation };
}

function checkState(report: ReleaseReadiness, id: string): string {
  return report.checks.find((check) => check.id === id)?.state ?? "unknown";
}

function healthEvidence(report: ReleaseReadiness): string {
  const check = report.checks.find((candidate) => candidate.id === "runtime-health");
  return check?.evidence.find((entry) => entry.startsWith("status:"))?.replace("status:", "") ?? "unknown";
}

function rolloutEvidence(report: ReleaseReadiness): string {
  return report.rollout ? `${report.rollout.canaryPercent}%${report.rollout.paused ? ",paused" : ""}${report.rollout.killSwitch.enabled ? ",kill-switch" : ""}` : "none";
}

function patchHashSummary(report: ReleaseReadiness): string {
  return report.manifest.patchHashes.map((hash) => hash.slice(0, 18)).join(", ") || "none";
}

function deltaItems(current: ReleaseReadiness, candidate: ReleaseReadiness): readonly ReleaseDeltaItem[] {
  return [
    item("score", "Readiness score", current.score, candidate.score, "Average of the release checks shown in the readiness report."),
    item("tone", "Release status", current.tone, candidate.tone, "Green is ready, amber needs review, and red is blocked."),
    item("policy", "Policy gate", checkState(current, "release-policy"), checkState(candidate, "release-policy"), "Policy combines conflicts, approvals, verification, and critical findings."),
    item("verification", "Browser verification", checkState(current, "browser-verification"), checkState(candidate, "browser-verification"), "The candidate must retain browser and visual evidence."),
    item("health", "Runtime health", healthEvidence(current), healthEvidence(candidate), "Latest observed health status for the release."),
    item("rollout", "Rollout controls", rolloutEvidence(current), rolloutEvidence(candidate), "Canary percentage, pause state, and kill switch posture."),
    item("manifest", "Patch hashes", patchHashSummary(current), patchHashSummary(candidate), "Content hashes attached to each immutable manifest."),
    item("audit", "Audit entries", current.audit.totalEntries, candidate.audit.totalEntries, "Hash-chain entries available for operator review."),
    item("rollback", "Rollback target", checkState(current, "rollback-target"), checkState(candidate, "rollback-target"), "A previous known-good release must remain available."),
  ];
}

function deltaTone(current: ReleaseReadiness, candidate: ReleaseReadiness, items: readonly ReleaseDeltaItem[]): ReadinessTone {
  if (candidate.tone === "red") return "red";
  if (candidate.tone === "amber" || items.some((item) => item.kind === "changed" && item.id === "health" && item.candidate === "degraded")) return "amber";
  return current.tone === "red" && candidate.tone === "green" ? "green" : candidate.tone;
}

function deltaSummary(current: ReleaseReadiness, candidate: ReleaseReadiness, scoreDelta: number, changedCount: number): string {
  if (candidate.tone === "red") return `Candidate ${candidate.release.version} remains blocked with ${changedCount} changed release signal${changedCount === 1 ? "" : "s"}.`;
  if (scoreDelta > 0) return `Candidate ${candidate.release.version} improves readiness by ${scoreDelta} points across ${changedCount} changed signal${changedCount === 1 ? "" : "s"}.`;
  if (scoreDelta < 0) return `Candidate ${candidate.release.version} reduces readiness by ${Math.abs(scoreDelta)} points; review before promotion.`;
  return `Candidate ${candidate.release.version} has the same readiness score with ${changedCount} changed signal${changedCount === 1 ? "" : "s"}.`;
}

export async function buildReleaseDelta(state: ApiState, currentId: string, candidateId: string, generatedAt = new Date().toISOString()): Promise<ReleaseDelta | null> {
  const current = await buildReleaseReadiness(state, currentId, new Date(generatedAt), generatedAt);
  const candidate = await buildReleaseReadiness(state, candidateId, new Date(generatedAt), generatedAt);
  if (!current || !candidate) return null;
  const items = deltaItems(current, candidate);
  const changedCount = items.filter((entry) => entry.kind !== "unchanged").length;
  const blockedCount = candidate.checks.filter((check) => check.tone === "red").length;
  const scoreDelta = candidate.score - current.score;
  const improved = scoreDelta > 0 || candidate.tone === "green" && current.tone !== "green";
  return { current: current.release, candidate: candidate.release, generatedAt, tone: deltaTone(current, candidate, items), scoreDelta, improved, summary: deltaSummary(current, candidate, scoreDelta, changedCount), items, changedCount, blockedCount };
}

export function releaseDeltaNarrative(delta: ReleaseDelta): string {
  const direction = delta.improved ? "safer" : delta.scoreDelta < 0 ? "riskier" : "not materially safer";
  return `${delta.candidate.version} is ${direction} than ${delta.current.version}. ${delta.summary}`;
}

export function deltaItemsForKind(delta: ReleaseDelta, kind: DeltaKind | undefined): readonly ReleaseDeltaItem[] {
  return kind ? delta.items.filter((item) => item.kind === kind) : delta.items;
}

export function deltaCsvRows(delta: ReleaseDelta): readonly (readonly (string | number | boolean | null)[])[] {
  return [["field", "kind", "current", "candidate", "explanation"], ...delta.items.map((entry) => [entry.label, entry.kind, entry.current, entry.candidate, entry.explanation])];
}

export function deltaStatus(delta: ReleaseDelta): "improved" | "unchanged" | "regressed" {
  return delta.improved ? "improved" : delta.scoreDelta < 0 ? "regressed" : "unchanged";
}
