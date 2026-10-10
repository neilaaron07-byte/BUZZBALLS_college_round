import type { ScanFinding } from "../../../packages/core/src/index";
import type { ApiState } from "./types";
import { summarizeFindings } from "./scan-analysis";
import { releaseHealthScore } from "./release-controller";

export interface SiteAnalytics {
  siteId: string;
  health: { score: number; trend: "up" | "flat" | "down"; sampleCount: number };
  findings: ReturnType<typeof summarizeFindings>;
  releases: { live: number; verified: number; rolledBack: number; canary: number };
  patchFlow: { drafts: number; review: number; verified: number; blocked: number };
  scanCoverage: { runs: number; completed: number; averageFindingCount: number };
}

export function siteAnalytics(state: ApiState, siteId: string): SiteAnalytics {
  const releaseIds = new Set(state.releases.filter((release) => release.siteId === siteId).map((release) => release.id));
  const patches = state.patches.filter((patch) => patch.identity.siteId === siteId);
  const scans = state.scanRuns.filter((scan) => scan.siteId === siteId);
  const events = state.healthEvents.filter((event) => releaseIds.has(event.releaseId));
  const scores = events.slice(-5).map((event) => event.status === "healthy" ? 100 : event.status === "degraded" ? 65 : 20);
  const score = scores.length === 0 ? 0 : Math.round(scores.reduce((sum, value) => sum + value, 0) / scores.length);
  const prior = scores.length > 1 ? scores.slice(0, -1).reduce((sum, value) => sum + value, 0) / (scores.length - 1) : score;
  const latestReleaseId = state.releases.filter((release) => release.siteId === siteId).at(-1)?.id;
  const releaseScore = latestReleaseId ? releaseHealthScore(state, latestReleaseId) : score;
  return { siteId, health: { score: releaseScore, trend: releaseScore > prior ? "up" : releaseScore < prior ? "down" : "flat", sampleCount: scores.length }, findings: summarizeFindings(state.findings), releases: { live: state.releases.filter((release) => release.siteId === siteId && release.status === "live").length, verified: state.releases.filter((release) => release.siteId === siteId && release.status === "verified").length, rolledBack: state.releases.filter((release) => release.siteId === siteId && release.status === "rolled_back").length, canary: state.rollouts.filter((rollout) => releaseIds.has(rollout.releaseId) && rollout.canaryPercent > 0 && rollout.canaryPercent < 100).length }, patchFlow: { drafts: patches.filter((patch) => patch.status === "draft").length, review: patches.filter((patch) => patch.status === "review").length, verified: patches.filter((patch) => patch.status === "verified").length, blocked: state.conflicts.filter((conflict) => conflict.severity === "blocking" && !conflict.resolvedAt && patches.some((patch) => patch.identity.id === conflict.patchId)).length }, scanCoverage: { runs: scans.length, completed: scans.filter((scan) => scan.status === "completed").length, averageFindingCount: scans.length === 0 ? 0 : Number((scans.reduce((sum, scan) => sum + scan.findingIds.length, 0) / scans.length).toFixed(2)) } };
}

export function findingTrend(state: ApiState, siteId: string): readonly { day: string; findings: number; critical: number }[] {
  const siteScans = state.scanRuns.filter((scan) => scan.siteId === siteId);
  const byDay = new Map<string, ScanFinding[]>();
  for (const scan of siteScans) {
    const day = (scan.finishedAt ?? scan.startedAt).slice(0, 10);
    const values = state.findings.filter((finding) => scan.findingIds.includes(finding.id));
    byDay.set(day, [...(byDay.get(day) ?? []), ...values]);
  }
  return [...byDay.entries()].sort(([left], [right]) => left.localeCompare(right)).map(([day, findings]) => ({ day, findings: findings.length, critical: findings.filter((finding) => finding.severity === "critical").length }));
}

export function detectorHealth(state: ApiState): readonly { detector: ScanFinding["detector"]; total: number; highConfidence: number }[] {
  const detectors = new Set(state.findings.map((finding) => finding.detector));
  return [...detectors].sort().map((detector) => { const findings = state.findings.filter((finding) => finding.detector === detector); return { detector, total: findings.length, highConfidence: findings.filter((finding) => finding.confidence >= 0.9).length }; });
}
