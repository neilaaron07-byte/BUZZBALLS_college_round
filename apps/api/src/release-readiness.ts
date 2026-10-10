import type { Manifest, Release } from "../../../packages/core/src/index";
import { buildAuditReport, type AuditReport } from "./audit-report";
import { evaluateReleasePolicy, type ReleasePolicyResult } from "./policies";
import { releaseSafety } from "./release-safety";
import { catalogVerification, type VerificationCatalogItem } from "./verification-catalog";
import type { ApiState, RolloutState } from "./types";

export type ReadinessTone = "green" | "amber" | "red";
export type ReadinessState = "passed" | "warning" | "blocked" | "unknown";

export interface ReadinessCheck {
  id: string;
  label: string;
  state: ReadinessState;
  tone: ReadinessTone;
  explanation: string;
  evidence: readonly string[];
  nextAction: string;
}

export interface ReadinessAction {
  id: string;
  label: string;
  tone: ReadinessTone;
  explanation: string;
  href: string;
}

export interface ReleaseReadiness {
  release: { id: string; siteId: string; environment: Release["environment"]; version: string; title: string; status: Release["status"] };
  generatedAt: string;
  tone: ReadinessTone;
  score: number;
  label: string;
  explanation: string;
  checks: readonly ReadinessCheck[];
  actions: readonly ReadinessAction[];
  policy: ReleasePolicyResult;
  manifest: Manifest;
  rollout: RolloutState | null;
  verification: VerificationCatalogItem | null;
  audit: Pick<AuditReport, "valid" | "totalEntries" | "lastTimestamp" | "reason">;
}

export interface ReadinessComparison {
  current: ReleaseReadiness;
  candidate: ReleaseReadiness;
  scoreDelta: number;
  improved: boolean;
  summary: string;
}

function stateTone(state: ReadinessState): ReadinessTone {
  return state === "blocked" ? "red" : state === "warning" || state === "unknown" ? "amber" : "green";
}

function check(id: string, label: string, state: ReadinessState, explanation: string, evidence: readonly string[], nextAction: string): ReadinessCheck {
  return { id, label, state, tone: stateTone(state), explanation, evidence, nextAction };
}

function releaseCheck(release: Release): ReadinessCheck {
  const state: ReadinessState = release.status === "rejected" || release.status === "rolled_back" ? "blocked" : release.status === "draft" || release.status === "review" ? "warning" : "passed";
  const explanation = state === "blocked" ? `Release ${release.version} is ${release.status}; it cannot be promoted safely.` : state === "warning" ? `Release ${release.version} is ${release.status}; verification and approval evidence must be reviewed.` : `Release ${release.version} is ${release.status} and has a valid lifecycle state.`;
  return check("release-state", "Release lifecycle", state, explanation, [`status:${release.status}`, `environment:${release.environment}`], state === "passed" ? "Keep the release under the configured rollout guard." : "Move the release through the approval and verification workflow.");
}

function manifestCheck(manifest: Manifest, now: Date): ReadinessCheck {
  const expired = new Date(manifest.expiresAt).getTime() <= now.getTime();
  const killSwitch = manifest.killSwitch.enabled;
  const hasPatches = manifest.patchHashes.length > 0;
  const state: ReadinessState = expired || killSwitch ? "blocked" : hasPatches ? "passed" : "warning";
  const explanation = expired ? "The signed manifest has expired and must be regenerated." : killSwitch ? `The kill switch is active${manifest.killSwitch.reason ? `: ${manifest.killSwitch.reason}` : "."}` : hasPatches ? `${manifest.patchHashes.length} content hash${manifest.patchHashes.length === 1 ? "" : "es"} is attached to this manifest.` : "The manifest has no patch hashes attached.";
  return check("manifest-integrity", "Manifest integrity", state, explanation, [`base:${manifest.baseHash}`, `patches:${manifest.patchHashes.length}`, `expires:${manifest.expiresAt}`], state === "passed" ? "Keep the manifest immutable through rollout." : "Regenerate the manifest and re-run verification before shipping.");
}

function policyCheck(policy: ReleasePolicyResult): ReadinessCheck {
  const state: ReadinessState = policy.status === "blocked" ? "blocked" : policy.status === "warning" ? "warning" : "passed";
  return check("release-policy", "Release policy", state, policy.nextAction, policy.checks.map((item) => `${item.label}:${item.status}`), state === "passed" ? "Continue to canary rollout." : policy.nextAction);
}

function verificationCheck(item: VerificationCatalogItem | null): ReadinessCheck {
  if (!item) return check("browser-verification", "Browser verification", "unknown", "No stored verification report is attached to this release.", [], "Run the published-versus-patched browser matrix before promotion.");
  const state: ReadinessState = item.gate.status === "blocked" || item.report.status === "blocked" ? "blocked" : item.gate.status === "warning" || item.report.status === "warning" ? "warning" : "passed";
  return check("browser-verification", "Browser verification", state, item.report.summary, [`report:${item.report.id}`, `score:${item.report.score}`, `checks:${item.report.checks.length}`], state === "passed" ? "Keep the report attached to this release." : "Fix the failing browser, visual, or accessibility check and replay verification.");
}

function healthCheck(state: ApiState, releaseId: string): ReadinessCheck {
  const events = state.healthEvents.filter((event) => event.releaseId === releaseId);
  const critical = events.filter((event) => event.status === "critical");
  const degraded = events.filter((event) => event.status === "degraded");
  const status: ReadinessState = critical.length > 0 ? "blocked" : degraded.length > 0 ? "warning" : events.length > 0 ? "passed" : "unknown";
  const latest = [...events].sort((left, right) => right.observedAt.localeCompare(left.observedAt))[0];
  const explanation = critical.length > 0 ? `${critical.length} critical health signal${critical.length === 1 ? "" : "s"} crossed the release boundary.` : degraded.length > 0 ? `${degraded.length} degraded health signal${degraded.length === 1 ? "" : "s"} need acknowledgement.` : latest ? latest.explanation : "No health events have been observed for this release.";
  return check("runtime-health", "Runtime health", status, explanation, latest ? [`latest:${latest.observedAt}`, `status:${latest.status}`, `value:${latest.value}`] : [], status === "passed" ? "Continue monitoring the canary." : "Inspect the health event and pause or roll back if the signal persists.");
}

function auditCheck(report: AuditReport): ReadinessCheck {
  const state: ReadinessState = report.valid ? "passed" : "blocked";
  return check("audit-chain", "Audit chain", state, report.reason, [`entries:${report.totalEntries}`, `last:${report.lastTimestamp ?? "none"}`], report.valid ? "Keep the chain attached to the release record." : "Stop promotion and investigate the broken audit chain.");
}

function rolloutCheck(rollout: RolloutState | null): ReadinessCheck {
  if (!rollout) return check("rollout-control", "Rollout controls", "unknown", "No rollout state is stored for this release.", [], "Create a canary state before promoting this release.");
  const blocked = rollout.killSwitch.enabled;
  const paused = rollout.paused;
  const state: ReadinessState = blocked ? "blocked" : paused ? "warning" : "passed";
  const explanation = blocked ? `Kill switch enabled${rollout.killSwitch.reason ? `: ${rollout.killSwitch.reason}` : "."}` : paused ? "Rollout is paused while the operator reviews release evidence." : `${rollout.canaryPercent}% canary is active with rollout controls available.`;
  return check("rollout-control", "Rollout controls", state, explanation, [`canary:${rollout.canaryPercent}%`, `paused:${String(paused)}`], state === "passed" ? "Promote only after the canary remains healthy." : "Review the rollout state before changing traffic.");
}

function rollbackCheck(state: ApiState, release: Release): ReadinessCheck {
  const previous = state.releases.filter((candidate) => candidate.siteId === release.siteId && candidate.environment === release.environment && candidate.id !== release.id && candidate.status === "rolled_back").sort((left, right) => right.createdAt.localeCompare(left.createdAt))[0];
  const readiness: ReadinessState = previous ? "passed" : "warning";
  return check("rollback-target", "Rollback target", readiness, previous ? `Rollback can restore ${previous.version} from ${previous.id}.` : "No previous rolled-back release is recorded for this environment.", previous ? [`target:${previous.id}`, `version:${previous.version}`] : [], previous ? "Keep the previous release available until rollout is complete." : "Record a known-good release before increasing traffic.");
}

function scoreChecks(checks: readonly ReadinessCheck[]): number {
  const points = checks.reduce((total, item) => total + (item.state === "passed" ? 100 : item.state === "warning" ? 62 : item.state === "unknown" ? 48 : 0), 0);
  return checks.length === 0 ? 0 : Math.round(points / checks.length);
}

function readinessLabel(tone: ReadinessTone): string {
  return tone === "green" ? "Ready to ship" : tone === "amber" ? "Review before shipping" : "Blocked from shipping";
}

function readinessExplanation(tone: ReadinessTone, checks: readonly ReadinessCheck[]): string {
  const blockers = checks.filter((item) => item.tone === "red");
  const warnings = checks.filter((item) => item.tone === "amber");
  if (blockers.length > 0) return `${blockers.length} release gate${blockers.length === 1 ? "" : "s"} failed. PATCHWORK will keep this release protected until the evidence is repaired.`;
  if (warnings.length > 0) return `${warnings.length} release signal${warnings.length === 1 ? "" : "s"} needs a human decision before promotion.`;
  return "Every required release signal is green and the rollback path is visible.";
}

function readinessActions(checks: readonly ReadinessCheck[]): readonly ReadinessAction[] {
  const actions: ReadinessAction[] = [];
  for (const item of checks) {
    if (item.state === "passed") continue;
    const href = item.id === "runtime-health" || item.id === "rollout-control" ? "/dashboard/incidents" : item.id === "audit-chain" ? "/dashboard/audit" : "/dashboard/releases";
    actions.push({ id: `action_${item.id}`, label: item.state === "blocked" ? `Resolve ${item.label.toLowerCase()}` : `Review ${item.label.toLowerCase()}`, tone: item.tone, explanation: item.nextAction, href });
  }
  return actions;
}

function verificationForRelease(state: ApiState, release: Release): VerificationCatalogItem | null {
  const reports = state.verificationReports.filter((report) => report.id.includes(release.id) || report.patchedUrl.includes(release.siteId));
  const latest = [...reports].sort((left, right) => right.createdAt.localeCompare(left.createdAt))[0];
  return latest ? catalogVerification(state, latest) : null;
}

export async function buildReleaseReadiness(state: ApiState, releaseId: string, now = new Date(), generatedAt = now.toISOString()): Promise<ReleaseReadiness | null> {
  const release = state.releases.find((candidate) => candidate.id === releaseId);
  if (!release) return null;
  const policy = evaluateReleasePolicy(state, release);
  const rollout = state.rollouts.find((candidate) => candidate.releaseId === release.id) ?? null;
  const verification = verificationForRelease(state, release);
  const audit = await buildAuditReport(state);
  const safety = await releaseSafety(state, release.id, now);
  const checks = [releaseCheck(release), manifestCheck(release.manifest, now), policyCheck(policy), verificationCheck(verification), healthCheck(state, release.id), auditCheck(audit), rolloutCheck(rollout), rollbackCheck(state, release)];
  const tone: ReadinessTone = safety?.status === "red" || checks.some((item) => item.tone === "red") ? "red" : safety?.status === "amber" || checks.some((item) => item.tone === "amber") ? "amber" : "green";
  const score = scoreChecks(checks);
  return { release: { id: release.id, siteId: release.siteId, environment: release.environment, version: release.version, title: release.title, status: release.status }, generatedAt, tone, score, label: readinessLabel(tone), explanation: readinessExplanation(tone, checks), checks, actions: readinessActions(checks), policy, manifest: release.manifest, rollout, verification, audit: { valid: audit.valid, totalEntries: audit.totalEntries, lastTimestamp: audit.lastTimestamp, reason: audit.reason } };
}

export async function compareReleaseReadiness(state: ApiState, currentId: string, candidateId: string, now = new Date()): Promise<ReadinessComparison | null> {
  const current = await buildReleaseReadiness(state, currentId, now);
  const candidate = await buildReleaseReadiness(state, candidateId, now);
  if (!current || !candidate) return null;
  const scoreDelta = candidate.score - current.score;
  const improved = scoreDelta > 0 || candidate.tone === "green" && current.tone !== "green";
  return { current, candidate, scoreDelta, improved, summary: improved ? `Candidate ${candidate.release.version} improves release readiness by ${Math.abs(scoreDelta)} points.` : `Candidate ${candidate.release.version} does not improve the current release safety score.` };
}

export function readinessCheckCounts(checks: readonly ReadinessCheck[]): Readonly<Record<ReadinessState, number>> {
  return { passed: checks.filter((item) => item.state === "passed").length, warning: checks.filter((item) => item.state === "warning").length, blocked: checks.filter((item) => item.state === "blocked").length, unknown: checks.filter((item) => item.state === "unknown").length };
}

export function readinessNarrative(report: ReleaseReadiness): string {
  const counts = readinessCheckCounts(report.checks);
  return `${report.label}. ${counts.passed} checks passed, ${counts.warning} warnings, ${counts.blocked} blockers, and ${counts.unknown} unknown signals. ${report.explanation}`;
}

export function readinessCsvRows(report: ReleaseReadiness): readonly (readonly (string | number | boolean | null)[])[] {
  return [["check", "state", "tone", "explanation", "nextAction"], ...report.checks.map((item) => [item.label, item.state, item.tone, item.explanation, item.nextAction])];
}
