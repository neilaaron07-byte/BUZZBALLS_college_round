import type { Conflict } from "../../core/src/index";
import type { HealthSignal, VerificationSignal } from "./contracts";

export interface Narrative {
  status: "green" | "amber" | "red";
  headline: string;
  detail: string;
  evidence: readonly string[];
}

export function explainConflict(conflict: Conflict): Narrative {
  const blocking = conflict.severity === "blocking";
  return { status: blocking ? "red" : "amber", headline: blocking ? "Release is blocked by a conflict" : "Review this conflict before shipping", detail: `${conflict.explanation} ${conflict.suggestedResolution}`, evidence: [`Conflict ${conflict.id}`, `Kind ${conflict.kind}`, `Left revision ${conflict.leftRevision ?? "not supplied"}`, `Right revision ${conflict.rightRevision ?? "not supplied"}`] };
}

export function explainReleaseRisk(verification: VerificationSignal | undefined, health: HealthSignal | undefined, ageHours: number): Narrative {
  const failed = verification?.failedChecks ?? 0;
  const healthScore = health?.score ?? 0;
  const stale = ageHours > 24;
  const status = failed > 0 || healthScore < 60 ? "red" : stale || (verification?.warningChecks ?? 0) > 0 || healthScore < 85 ? "amber" : "green";
  return { status, headline: status === "green" ? "Release signals are within policy" : status === "amber" ? "Release needs review" : "Release should stay blocked", detail: `Verification has ${failed} failed and ${verification?.warningChecks ?? 0} warning checks; health is ${health ? `${health.score}/100` : "not measured"}; release age is ${ageHours.toFixed(1)} hours.`, evidence: [`Verification ${verification?.status ?? "not supplied"}`, `Health ${health?.score ?? "not supplied"}`, `Age ${ageHours.toFixed(1)} hours`] };
}

export function explainRollback(releaseId: string, previousReleaseId: string, trigger: string): Narrative {
  return { status: "red", headline: `Rollback ${releaseId} to ${previousReleaseId}`, detail: `${trigger} The rollback restores the last named release and should be confirmed by a release owner before execution.`, evidence: [`Current release ${releaseId}`, `Previous release ${previousReleaseId}`, `Trigger ${trigger}`] };
}
