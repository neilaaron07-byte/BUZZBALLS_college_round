import type { DashboardData, DashboardTone } from "./dashboard-types";

export type HealthState = "healthy" | "degraded" | "critical";
export type ReleaseGateState = "passed" | "review" | "blocked";
export type ReleaseIntent = "pause" | "resume" | "promote" | "rollback" | "kill-switch" | "restore";

export type HealthSignal = {
  id: string;
  label: string;
  metric: string;
  observed: number;
  displayValue: string;
  threshold: string;
  state: HealthState;
  tone: DashboardTone;
  detail: string;
  observedAt: string;
};

export type ReleaseGate = {
  id: string;
  label: string;
  state: ReleaseGateState;
  tone: DashboardTone;
  evidence: string;
  nextAction: string;
};

export type ReleaseControl = {
  releaseId: string;
  version: string;
  title: string;
  canaryPercent: number;
  paused: boolean;
  killSwitchEnabled: boolean;
  rolledBack: boolean;
  previousHealthyVersion: string | null;
  healthSignals: readonly HealthSignal[];
  gates: readonly ReleaseGate[];
  healthScore: number;
  readiness: "ready" | "review" | "blocked";
  tone: DashboardTone;
  headline: string;
  explanation: string;
  nextAction: ReleaseIntent | "review";
};

export type ReleaseTransition = {
  allowed: boolean;
  control: ReleaseControl;
  intent: ReleaseIntent;
  event: { type: string; detail: string; tone: DashboardTone };
};

export type AuditRecord = {
  id: string;
  action: string;
  subjectId: string;
  actor: string;
  occurredAt: string;
  tone: DashboardTone;
  hash: string;
  previousHash: string;
  detail: string;
};

export type AuditSummary = {
  records: readonly AuditRecord[];
  chainValid: boolean;
  hash: string;
  eventCount: number;
  tone: DashboardTone;
  headline: string;
  explanation: string;
};

const signalTime = "2026-10-10T07:58:00.000Z";
const actors = ["Maya Singh", "Lena Ortiz", "Owen Brooks"];

function healthTone(state: HealthState): DashboardTone {
  return state === "healthy" ? "green" : state === "degraded" ? "amber" : "red";
}

function gateTone(state: ReleaseGateState): DashboardTone {
  return state === "passed" ? "green" : state === "review" ? "amber" : "red";
}

function stateFor(value: number, warning: number, critical: number, inverted = false): HealthState {
  if (inverted) return value <= critical ? "critical" : value <= warning ? "degraded" : "healthy";
  return value >= critical ? "critical" : value >= warning ? "degraded" : "healthy";
}

export function healthSignalLabel(state: HealthState): string {
  return state === "healthy" ? "Healthy" : state === "degraded" ? "Degraded" : "Critical";
}

export function buildHealthSignals(overrides: Partial<Record<"errors" | "latency" | "sessions", number>> = {}): HealthSignal[] {
  const errors = overrides.errors ?? .4;
  const latency = overrides.latency ?? .68;
  const sessions = overrides.sessions ?? 99.6;
  const values: HealthSignal[] = [
    { id: "checkout-error-rate", label: "Checkout errors", metric: "error_rate", observed: errors, displayValue: `${errors.toFixed(1)}%`, threshold: "< 2.0%", state: stateFor(errors, 1.5, 2), detail: errors < 1.5 ? "Checkout errors are below the production canary threshold." : errors < 2 ? "Checkout errors are near the rollback boundary; keep traffic bounded." : "Checkout errors crossed the rollback threshold.", observedAt: signalTime, tone: healthTone(stateFor(errors, 1.5, 2)) },
    { id: "checkout-latency", label: "Median latency", metric: "p50_latency", observed: latency, displayValue: `${latency.toFixed(2)}s`, threshold: "< 1.50s", state: stateFor(latency, 1.15, 1.5), detail: latency < 1.15 ? "Median checkout latency is inside the preferred canary band." : latency < 1.5 ? "Latency is above the preferred band but below automatic rollback." : "Latency crossed the release rollback boundary.", observedAt: signalTime, tone: healthTone(stateFor(latency, 1.15, 1.5)) },
    { id: "successful-sessions", label: "Successful sessions", metric: "success_rate", observed: sessions, displayValue: `${sessions.toFixed(1)}%`, threshold: "> 98.0%", state: stateFor(sessions, 99, 98, true), detail: sessions > 99 ? "The visitor path is completing normally in the observed window." : sessions > 98 ? "Successful sessions are watch-only; no automatic rollback yet." : "Successful sessions crossed the automatic rollback boundary.", observedAt: signalTime, tone: healthTone(stateFor(sessions, 99, 98, true)) },
  ];
  return values;
}

function gateFor(id: string, label: string, passed: boolean, review: boolean, evidence: string, nextAction: string): ReleaseGate {
  const state: ReleaseGateState = passed ? "passed" : review ? "review" : "blocked";
  return { id, label, state, tone: gateTone(state), evidence, nextAction };
}

export function buildReleaseGates(data: DashboardData, signals = buildHealthSignals()): ReleaseGate[] {
  const release = data.workspace.release;
  const hasCritical = data.workspace.findings.some((finding) => finding.severity === "critical" || finding.severity === "high");
  const hasConflict = (data.workspace.stages.fix.counts.conflicts ?? 0) > 0;
  const healthCritical = signals.some((signal) => signal.state === "critical");
  const healthReview = signals.some((signal) => signal.state === "degraded");
  return [
    gateFor("verification", "Browser verification", data.workspace.stages.ship.tone === "green", false, "Interaction, visual, accessibility, console, and network evidence are attached.", "Replay browser evidence before promotion."),
    gateFor("target", "Target resolution", data.workspace.findings.every((finding) => finding.confidence >= .9) && !hasCritical, false, `${data.workspace.findings.length || "No"} finding${data.workspace.findings.length === 1 ? "" : "s"} have explainable target confidence.`, "Open SCAN and inspect the target evidence."),
    gateFor("review", "Human review", !hasConflict, true, hasConflict ? "One overlapping draft needs an explicit keep or archive decision." : "Required reviewers have acknowledged the candidate.", "Resolve the visible conflict before widening traffic."),
    gateFor("health", "Live health", !healthCritical, healthReview, healthCritical ? "A health signal crossed the automatic rollback boundary." : healthReview ? "Health is watch-only while the canary remains bounded." : "Checkout error rate, latency, and sessions are within policy.", "Open Incidents and replay the health window."),
    gateFor("rollback", "Rollback manifest", Boolean(release?.version), false, release ? `Previous healthy manifest is available for ${release.version}.` : "No signed production release is connected.", "Keep the previous manifest attached."),
  ];
}

function readinessFor(gates: readonly ReleaseGate[], canary: number, paused: boolean, killSwitch: boolean): ReleaseControl["readiness"] {
  if (killSwitch || gates.some((gate) => gate.state === "blocked")) return "blocked";
  if (paused || canary < 100 || gates.some((gate) => gate.state === "review")) return "review";
  return "ready";
}

function controlTone(readiness: ReleaseControl["readiness"]): DashboardTone {
  return readiness === "ready" ? "green" : readiness === "review" ? "amber" : "red";
}

function controlHeadline(readiness: ReleaseControl["readiness"], canary: number, paused: boolean): string {
  if (readiness === "blocked") return "Release is blocked from public traffic";
  if (paused) return "Rollout is paused for review";
  if (readiness === "review") return `${canary}% canary is healthy; review before promotion`;
  return "All release gates are green";
}

function controlExplanation(readiness: ReleaseControl["readiness"], gates: readonly ReleaseGate[], canary: number): string {
  const review = gates.filter((gate) => gate.state === "review").length;
  const blocked = gates.filter((gate) => gate.state === "blocked").length;
  if (blocked) return `${blocked} release gate${blocked === 1 ? "" : "s"} block promotion. Keep the ${canary}% canary bounded until the red evidence is repaired.`;
  if (review) return `${review} release gate${review === 1 ? "" : "s"} need review. The canary is bounded and the previous healthy manifest remains available.`;
  return "Verification, target resolution, human review, live health, and rollback evidence are aligned for promotion.";
}

export function buildReleaseControl(data: DashboardData, overrides: Partial<Pick<ReleaseControl, "canaryPercent" | "paused" | "killSwitchEnabled" | "rolledBack">> = {}, signalOverrides: Partial<Record<"errors" | "latency" | "sessions", number>> = {}): ReleaseControl {
  const release = data.workspace.release;
  const canaryPercent = overrides.canaryPercent ?? release?.rollout?.canaryPercent ?? 0;
  const paused = overrides.paused ?? release?.rollout?.paused ?? false;
  const killSwitchEnabled = overrides.killSwitchEnabled ?? release?.rollout?.killSwitch.enabled ?? false;
  const rolledBack = overrides.rolledBack ?? Boolean(release?.rolledBackAt);
  const healthSignals = buildHealthSignals(signalOverrides);
  const gates = buildReleaseGates(data, healthSignals);
  const readiness = readinessFor(gates, canaryPercent, paused, killSwitchEnabled || rolledBack);
  const tone = controlTone(readiness);
  const healthScore = Math.round(healthSignals.reduce((sum, signal) => sum + (signal.state === "healthy" ? 100 : signal.state === "degraded" ? 70 : 20), 0) / healthSignals.length);
  return { releaseId: release?.id ?? "release-unconnected", version: release?.version ?? "No release", title: release?.title ?? "No production release", canaryPercent, paused, killSwitchEnabled, rolledBack, previousHealthyVersion: release?.rolledBackAt ? release.version : release ? `previous-${release.version}` : null, healthSignals, gates, healthScore, readiness, tone, headline: controlHeadline(readiness, canaryPercent, paused), explanation: controlExplanation(readiness, gates, canaryPercent), nextAction: readiness === "blocked" ? "review" : paused ? "resume" : canaryPercent < 100 ? "promote" : "review" };
}

export function releaseReadinessLabel(readiness: ReleaseControl["readiness"]): string {
  return readiness === "ready" ? "Ready to promote" : readiness === "review" ? "Review before promote" : "Blocked from promote";
}

export function releaseIntentLabel(intent: ReleaseIntent): string {
  return intent === "kill-switch" ? "Enable kill switch" : intent === "rollback" ? "Rollback release" : intent === "promote" ? "Promote release" : intent === "pause" ? "Pause rollout" : intent === "resume" ? "Resume rollout" : "Restore release";
}

export function transitionRelease(control: ReleaseControl, intent: ReleaseIntent): ReleaseTransition {
  if (intent === "pause") {
    if (control.paused || control.killSwitchEnabled) return { allowed: false, control, intent, event: { type: "pause_rejected", detail: "The rollout is already paused or protected by the kill switch.", tone: "amber" } };
    const next = { ...control, paused: true, readiness: "review" as const, tone: "amber" as const, headline: "Rollout is paused for review", nextAction: "resume" as const };
    return { allowed: true, control: next, intent, event: { type: "release_paused", detail: "Public traffic stays bounded while the operator reviews health evidence.", tone: "amber" } };
  }
  if (intent === "resume") {
    if (!control.paused || control.killSwitchEnabled) return { allowed: false, control, intent, event: { type: "resume_rejected", detail: "Resume is unavailable while the release is not paused or the kill switch is on.", tone: "red" } };
    const next = { ...control, paused: false, readiness: control.canaryPercent < 100 ? "review" as const : "ready" as const, tone: control.canaryPercent < 100 ? "amber" as const : "green" as const, headline: control.canaryPercent < 100 ? `${control.canaryPercent}% canary resumed` : "All release gates are green", nextAction: control.canaryPercent < 100 ? "promote" as const : "review" as const };
    return { allowed: true, control: next, intent, event: { type: "release_resumed", detail: "The operator resumed bounded traffic after acknowledging the visible evidence.", tone: "green" } };
  }
  if (intent === "promote") {
    if (control.readiness !== "ready" || control.canaryPercent < 75 || control.paused || control.killSwitchEnabled) return { allowed: false, control, intent, event: { type: "promotion_rejected", detail: "Promotion needs green policy gates, a healthy canary, and no pause or kill-switch state.", tone: "amber" } };
    const next = { ...control, canaryPercent: 100, readiness: "ready" as const, tone: "green" as const, headline: "All release gates are green", nextAction: "review" as const };
    return { allowed: true, control: next, intent, event: { type: "release_promoted", detail: "The signed manifest now serves 100% of production traffic.", tone: "green" } };
  }
  if (intent === "rollback") {
    if (!control.previousHealthyVersion) return { allowed: false, control, intent, event: { type: "rollback_rejected", detail: "No previous healthy manifest is attached to this release.", tone: "red" } };
    const next = { ...control, rolledBack: true, paused: true, canaryPercent: 0, readiness: "review" as const, tone: "amber" as const, headline: "Previous release restored", nextAction: "restore" as const };
    return { allowed: true, control: next, intent, event: { type: "release_rolled_back", detail: "The previous healthy manifest is serving while this release remains available for investigation.", tone: "amber" } };
  }
  if (intent === "restore") {
    if (!control.rolledBack) return { allowed: false, control, intent, event: { type: "restore_rejected", detail: "There is no rollback state to restore.", tone: "amber" } };
    const next = { ...control, rolledBack: false, paused: true, canaryPercent: 25, readiness: "review" as const, tone: "amber" as const, headline: "Candidate restored to a bounded canary", nextAction: "promote" as const };
    return { allowed: true, control: next, intent, event: { type: "release_restored", detail: "The candidate is back behind a 25% canary for a fresh review.", tone: "amber" } };
  }
  if (control.killSwitchEnabled) return { allowed: false, control, intent, event: { type: "kill_switch_unchanged", detail: "The kill switch is already protecting public traffic.", tone: "red" } };
  const next = { ...control, killSwitchEnabled: true, paused: true, readiness: "blocked" as const, tone: "red" as const, headline: "Kill switch is protecting traffic", nextAction: "review" as const };
  return { allowed: true, control: next, intent, event: { type: "kill_switch_enabled", detail: "The current release is paused while the previous healthy manifest remains available.", tone: "red" } };
}

export function buildAuditSummary(data: DashboardData, tampered = false): AuditSummary {
  const activities = [...data.workspace.recentActivity].sort((left, right) => left.timestamp.localeCompare(right.timestamp));
  const records: AuditRecord[] = activities.map((activity, index) => { const previousHash = index === 0 ? "genesis" : `sha256:${String(index).padStart(2, "0")}${"a".repeat(10)}`; const hash = `sha256:${String(index + 1).padStart(2, "0")}${"b".repeat(10)}`; return { id: activity.id, action: activity.type, subjectId: activity.subjectId, actor: actors[index % actors.length] ?? "Maya Singh", occurredAt: activity.timestamp, tone: activity.severity === "critical" ? "red" : activity.severity === "warning" ? "amber" : "green", hash, previousHash, detail: activity.detail }; });
  const chainValid = !tampered && records.every((record, index) => index === 0 ? record.previousHash === "genesis" : record.previousHash === `sha256:${String(index).padStart(2, "0")}${"a".repeat(10)}`);
  return { records, chainValid, hash: chainValid ? records.at(-1)?.hash ?? "genesis" : "sha256:tampered", eventCount: records.length, tone: chainValid ? "green" : "red", headline: chainValid ? "The evidence chain is intact." : "A tamper test found a broken link.", explanation: chainValid ? "Every entry points to the prior hash and can be handed off without exposing credentials." : "PATCHWORK blocks release handoff until the broken link is investigated and the chain is rebuilt from trusted evidence." };
}

export function auditNarrative(summary: AuditSummary): string {
  return `${summary.eventCount} event${summary.eventCount === 1 ? "" : "s"} in the chain · ${summary.hash}. ${summary.explanation}`;
}

export function auditCsv(summary: AuditSummary): string {
  const columns = ["id", "action", "subjectId", "actor", "occurredAt", "tone", "hash", "previousHash", "detail"] as const;
  const escape = (value: string) => `"${value.replaceAll('"', '""')}"`;
  return [columns.join(","), ...summary.records.map((record) => columns.map((column) => escape(record[column])).join(","))].join("\n");
}
