import { releases } from "./catalog";
import type { ReleaseMode, ReleaseSignal } from "./types";

export type ReleaseGate = {
  id: "schema" | "verification" | "review" | "lifecycle";
  label: string;
  status: "green" | "amber" | "red";
  detail: string;
};

export type TargetEvidence = {
  selector: string;
  confidence: number;
  outcome: "exact" | "moved" | "ambiguous" | "missing";
  reason: string;
  blastRadius: "low" | "medium" | "high";
};

export type ReleaseTimelineEvent = {
  time: string;
  label: string;
  detail: string;
  tone: "green" | "amber" | "red" | "violet";
};

export type ReleaseHealth = {
  mode: ReleaseMode;
  score: number;
  posture: "healthy" | "review" | "blocked";
  primary: ReleaseSignal;
  gates: ReleaseGate[];
  target: TargetEvidence;
};

export function targetEvidence(mode: ReleaseMode): TargetEvidence {
  if (mode === "v1") return { selector: 'button[aria-label="Add to cart"]', confidence: .99, outcome: "exact", reason: "The semantic target is present, unique, and keyboard reachable.", blastRadius: "low" };
  if (mode === "v2") return { selector: 'button[aria-label="Add to cart"]', confidence: .98, outcome: "moved", reason: "The target is still unique, but a promo layer now intercepts its click path.", blastRadius: "medium" };
  return { selector: 'button[aria-label="Add to cart"]', confidence: .58, outcome: "ambiguous", reason: "Two purchase actions share the same label after the wrapper refactor.", blastRadius: "high" };
}

export function gateStatus(mode: ReleaseMode, gate: ReleaseGate["id"]): ReleaseGate["status"] {
  if (mode === "v1") return "green";
  if (gate === "schema" || gate === "lifecycle") return "green";
  if (mode === "v2" && gate === "verification") return "red";
  if (mode === "v3" && gate === "verification") return "amber";
  return "amber";
}

export function gateDetail(mode: ReleaseMode, gate: ReleaseGate["id"]): string {
  if (gate === "schema") return mode === "v3" ? "Manifest parsed; target identity needs review." : "Allowlisted operation and inverse are attached.";
  if (gate === "verification") return mode === "v1" ? "12 browser checks passed." : mode === "v2" ? "Click probe fails before the patch." : "Probe paused until ambiguity is resolved.";
  if (gate === "review") return mode === "v1" ? "No manual intervention required." : "Maya Chen owns the next review decision.";
  return "Last healthy release remains available for rollback.";
}

export function releaseGates(mode: ReleaseMode): ReleaseGate[] {
  const definitions: Array<[ReleaseGate["id"], string]> = [["schema", "Schema"], ["verification", "Verification"], ["review", "Review"], ["lifecycle", "Lifecycle"]];
  return definitions.map(([id, label]) => ({ id, label, status: gateStatus(mode, id), detail: gateDetail(mode, id) }));
}

export function scoreSignals(signals: ReleaseSignal[]): number {
  const points = signals.reduce((score, signal) => score + (signal.tone === "green" ? 34 : signal.tone === "amber" ? 15 : 0), 0);
  return Math.min(100, Math.max(0, points + 1));
}

export function releaseHealth(mode: ReleaseMode): ReleaseHealth {
  const fixture = releases[mode];
  const primary = fixture.signals.find((signal) => signal.tone === "red") ?? fixture.signals.find((signal) => signal.tone === "amber") ?? fixture.signals[0]!;
  const score = scoreSignals(fixture.signals);
  const posture = mode === "v1" ? "healthy" : mode === "v2" ? "blocked" : "review";
  return { mode, score, posture, primary, gates: releaseGates(mode), target: targetEvidence(mode) };
}

export function releaseLabel(mode: ReleaseMode): string {
  return releases[mode].label;
}

export function releaseVersion(mode: ReleaseMode): string {
  return releases[mode].version;
}

export function canApplyPatch(mode: ReleaseMode, confidence: number, hasInverse: boolean): boolean {
  return hasInverse && confidence >= (mode === "v3" ? .72 : .9) && mode !== "v3";
}

export function explainApplyDecision(mode: ReleaseMode, confidence: number, hasInverse: boolean): string {
  if (!hasInverse) return "Blocked because the inverse operation is missing.";
  if (mode === "v3") return "Blocked because two semantic candidates remain; choose one before applying.";
  if (confidence < .9) return "Blocked because target confidence is below the safe apply threshold.";
  return "Safe to preview: the target is unique and the inverse operation is attached.";
}

export function canPromote(mode: ReleaseMode, verificationPassed: boolean, reviewerApproved: boolean): boolean {
  return mode === "v1" && verificationPassed && reviewerApproved;
}

export function rollbackReason(mode: ReleaseMode): string {
  if (mode === "v1") return "Rollback remains available even though the baseline is healthy.";
  if (mode === "v2") return "Rollback protects visitors while the intercepted click is repaired.";
  return "Rollback protects visitors while a reviewer resolves the ambiguous target.";
}

export function releaseTimeline(mode: ReleaseMode): ReleaseTimelineEvent[] {
  const fixture = releases[mode];
  const events: ReleaseTimelineEvent[] = [
    { time: "09:42", label: "Release observed", detail: `${fixture.version} is serving the fixture storefront.`, tone: mode === "v1" ? "green" : "amber" },
    { time: "09:44", label: "Scanner completed", detail: fixture.scannerFindings.length ? `${fixture.scannerFindings.length} finding${fixture.scannerFindings.length === 1 ? "" : "s"} attached to the release.` : "No findings were returned.", tone: fixture.scannerFindings.length ? "amber" : "green" },
    { time: "09:46", label: mode === "v1" ? "Verification passed" : "Verification held", detail: mode === "v1" ? "Click, visual, accessibility, and console probes passed." : rollbackReason(mode), tone: mode === "v1" ? "green" : "red" },
    { time: "09:48", label: "Operator next action", detail: mode === "v1" ? "Promote the healthy candidate after review." : fixture.mode === "v2" ? "Preview the inverse operation before review." : "Resolve the duplicate semantic target before preview.", tone: mode === "v1" ? "violet" : "amber" },
  ];
  return events;
}

export function signalToneLabel(tone: ReleaseSignal["tone"]): string {
  return tone === "green" ? "Healthy" : tone === "amber" ? "Review" : "Blocked";
}

export function findingTitle(finding: string): string {
  const titles: Record<string, string> = { "hidden-buy-button": "Buy button hidden by a promo layer", "low-contrast-price": "Price label fails contrast", "stale-return-copy": "Return copy is out of date", "duplicate-purchase-action": "Duplicate purchase action detected", "moved-target": "Target moved after refactor", "ambiguous-target": "Target needs a human decision", "wrapper-refactor": "Wrapper changed around the purchase panel" };
  return titles[finding] ?? "Release finding";
}

export function findingSeverity(finding: string): "red" | "amber" | "green" {
  if (finding === "hidden-buy-button" || finding === "ambiguous-target") return "red";
  if (finding === "low-contrast-price" || finding === "moved-target") return "amber";
  return "green";
}

export function releaseSummary(mode: ReleaseMode): { title: string; detail: string; tone: "green" | "amber" | "red" } {
  const health = releaseHealth(mode);
  return { title: `${releaseLabel(mode)} · ${health.score}% evidence health`, detail: health.primary.detail, tone: health.posture === "healthy" ? "green" : health.posture === "review" ? "amber" : "red" };
}

export function modeFromReleasePath(value: string | null | undefined): ReleaseMode {
  return value === "v1" || value === "v3" ? value : "v2";
}
