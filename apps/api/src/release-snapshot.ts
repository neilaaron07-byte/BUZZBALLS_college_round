import { canonicalJson, sha256, type Patch, type Release } from "../../../packages/core/src/index";
import { buildAuditReport } from "./audit-report";
import { evaluateReleasePolicy } from "./policies";
import { buildReleaseReadiness, type ReadinessTone } from "./release-readiness";
import type { ApiState, RolloutState } from "./types";

export interface ReleaseSnapshotPatch {
  id: string;
  title: string;
  revision: number;
  contentHash: string;
  status: Patch["status"];
  operationCount: number;
}

export interface ReleaseSnapshot {
  schemaVersion: 1;
  release: { id: string; siteId: string; environment: Release["environment"]; version: string; title: string; status: Release["status"] };
  generatedAt: string;
  snapshotHash: string;
  readiness: { tone: ReadinessTone; score: number; label: string };
  manifest: Release["manifest"];
  patches: readonly ReleaseSnapshotPatch[];
  rollout: RolloutState | null;
  health: { healthy: number; degraded: number; critical: number; latestAt: string | null };
  audit: { valid: boolean; totalEntries: number; lastTimestamp: string | null };
  policy: { status: string; failed: number; warnings: number };
}

function releaseFor(state: ApiState, releaseId: string): Release | null {
  return state.releases.find((release) => release.id === releaseId) ?? null;
}

function patchesFor(state: ApiState, release: Release): readonly ReleaseSnapshotPatch[] {
  const hashes = new Set(release.manifest.patchHashes);
  return state.patches.filter((patch) => hashes.has(patch.revision.contentHash)).map((patch) => ({ id: patch.identity.id, title: patch.title, revision: patch.revision.revision, contentHash: patch.revision.contentHash, status: patch.status, operationCount: patch.operations.length }));
}

function healthFor(state: ApiState, releaseId: string): ReleaseSnapshot["health"] {
  const events = state.healthEvents.filter((event) => event.releaseId === releaseId);
  const latest = [...events].sort((left, right) => right.observedAt.localeCompare(left.observedAt))[0];
  return { healthy: events.filter((event) => event.status === "healthy").length, degraded: events.filter((event) => event.status === "degraded").length, critical: events.filter((event) => event.status === "critical").length, latestAt: latest?.observedAt ?? null };
}

function policyFor(state: ApiState, release: Release): ReleaseSnapshot["policy"] {
  const policy = evaluateReleasePolicy(state, release);
  return { status: policy.status, failed: policy.checks.filter((check) => check.status === "failed").length, warnings: policy.checks.filter((check) => check.status === "warning").length };
}

async function contentHash(input: Omit<ReleaseSnapshot, "snapshotHash">): Promise<string> {
  return sha256(canonicalJson(input));
}

export async function buildReleaseSnapshot(state: ApiState, releaseId: string, generatedAt = new Date().toISOString()): Promise<ReleaseSnapshot | null> {
  const release = releaseFor(state, releaseId);
  if (!release) return null;
  const readiness = await buildReleaseReadiness(state, releaseId, new Date(generatedAt), generatedAt);
  const audit = await buildAuditReport(state);
  const snapshotBase = { schemaVersion: 1 as const, release: { id: release.id, siteId: release.siteId, environment: release.environment, version: release.version, title: release.title, status: release.status }, generatedAt, readiness: { tone: readiness?.tone ?? "amber" as const, score: readiness?.score ?? 0, label: readiness?.label ?? "No readiness report" }, manifest: release.manifest, patches: patchesFor(state, release), rollout: state.rollouts.find((rollout) => rollout.releaseId === release.id) ?? null, health: healthFor(state, release.id), audit: { valid: audit.valid, totalEntries: audit.totalEntries, lastTimestamp: audit.lastTimestamp }, policy: policyFor(state, release) };
  return { ...snapshotBase, snapshotHash: await contentHash(snapshotBase) };
}

export function snapshotSummary(snapshot: ReleaseSnapshot): string {
  return `${snapshot.release.version} is ${snapshot.readiness.label} at ${snapshot.readiness.score}/100. ${snapshot.patches.length} patch${snapshot.patches.length === 1 ? "" : "es"} and ${snapshot.audit.totalEntries} audit entr${snapshot.audit.totalEntries === 1 ? "y" : "ies"} are included.`;
}

export function snapshotStatus(snapshot: ReleaseSnapshot): "green" | "amber" | "red" {
  return snapshot.readiness.tone;
}

export async function verifySnapshotHash(snapshot: ReleaseSnapshot): Promise<boolean> {
  const { snapshotHash, ...snapshotWithoutHash } = snapshot;
  const recalculated = await contentHash(snapshotWithoutHash);
  return snapshotHash === recalculated;
}

export function snapshotReleaseKey(snapshot: ReleaseSnapshot): string {
  return `${snapshot.release.siteId}:${snapshot.release.environment}:${snapshot.release.id}`;
}

export function snapshotHasPatch(snapshot: ReleaseSnapshot, patchId: string): boolean {
  return snapshot.patches.some((patch) => patch.id === patchId);
}

export function snapshotHealthTone(snapshot: ReleaseSnapshot): "green" | "amber" | "red" {
  if (snapshot.health.critical > 0) return "red";
  if (snapshot.health.degraded > 0 || snapshot.health.healthy === 0) return "amber";
  return "green";
}

export function snapshotMetricSummary(snapshot: ReleaseSnapshot): Readonly<Record<string, string | number | boolean>> {
  return { readinessScore: snapshot.readiness.score, patchCount: snapshot.patches.length, auditEntries: snapshot.audit.totalEntries, auditValid: snapshot.audit.valid, canaryPercent: snapshot.rollout?.canaryPercent ?? 0, healthCritical: snapshot.health.critical };
}

export function snapshotEvidenceLines(snapshot: ReleaseSnapshot): readonly string[] {
  return [
    `Release ${snapshot.release.version} (${snapshot.release.id})`,
    `Snapshot ${snapshot.snapshotHash}`,
    `Readiness ${snapshot.readiness.label} at ${snapshot.readiness.score}/100`,
    `${snapshot.patches.length} patch${snapshot.patches.length === 1 ? "" : "es"} attached`,
    `Audit chain ${snapshot.audit.valid ? "valid" : "invalid"} with ${snapshot.audit.totalEntries} entries`,
  ];
}

export function snapshotCanRollback(snapshot: ReleaseSnapshot): boolean {
  const hasKnownRelease = snapshot.release.environment === "production";
  const hasPatchHistory = snapshot.patches.length > 0;
  const chainIsValid = snapshot.audit.valid;
  return chainIsValid && hasKnownRelease && hasPatchHistory;
}

export function snapshotPolicyTone(snapshot: ReleaseSnapshot): "green" | "amber" | "red" {
  const hasFailures = snapshot.policy.failed > 0;
  const hasWarnings = snapshot.policy.warnings > 0;
  if (hasFailures) return "red";
  if (hasWarnings) return "amber";
  return "green";
}

export function snapshotPatchSummary(snapshot: ReleaseSnapshot): readonly { id: string; status: Patch["status"]; operationCount: number }[] {
  return snapshot.patches.map((patch) => ({
    id: patch.id,
    status: patch.status,
    operationCount: patch.operationCount,
  }));
}

export function snapshotPatchIds(snapshot: ReleaseSnapshot): readonly string[] {
  const patchIds = snapshot.patches.map((patch) => patch.id);
  const uniqueIds = new Set(patchIds);
  if (uniqueIds.size !== patchIds.length) return [...uniqueIds];
  return [...uniqueIds];
}

export function snapshotPatchCountByStatus(snapshot: ReleaseSnapshot): Readonly<Record<Patch["status"], number>> {
  const counts = Object.fromEntries(snapshot.patches.map((patch) => [patch.status, 0])) as Record<Patch["status"], number>;
  for (const patch of snapshot.patches) counts[patch.status] = (counts[patch.status] ?? 0) + 1;
  return counts;
}

export function snapshotCsvRows(snapshot: ReleaseSnapshot): readonly (readonly (string | number | boolean | null)[])[] {
  return [
    ["field", "value"],
    ["release", snapshot.release.id],
    ["version", snapshot.release.version],
    ["snapshotHash", snapshot.snapshotHash],
    ["readiness", snapshot.readiness.label],
    ["score", snapshot.readiness.score],
    ["patches", snapshot.patches.length],
    ["auditEntries", snapshot.audit.totalEntries],
    ["auditValid", snapshot.audit.valid],
  ];
}
