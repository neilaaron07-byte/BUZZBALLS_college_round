import type { ApiState } from "./types";

export interface MetricsSnapshot {
  requests: number;
  errors: number;
  errorRatePercent: number;
  idempotentReplays: number;
  bytesRejected: number;
  sites: number;
  patches: number;
  liveReleases: number;
  openFindings: number;
  openConflicts: number;
  verificationPassRate: number;
  healthEventRate: number;
}

export function metricsSnapshot(state: ApiState, volatile: { requests: number; errors: number; idempotentReplays: number; bytesRejected: number }): MetricsSnapshot {
  const requests = state.metrics.requests + volatile.requests;
  const errors = state.metrics.errors + volatile.errors;
  const reports = state.verificationReports;
  const healthyEvents = state.healthEvents.filter((event) => event.status === "healthy").length;
  return { requests, errors, errorRatePercent: requests === 0 ? 0 : Number((errors / requests * 100).toFixed(2)), idempotentReplays: state.metrics.idempotentReplays + volatile.idempotentReplays, bytesRejected: state.metrics.bytesRejected + volatile.bytesRejected, sites: state.sites.length, patches: state.patches.length, liveReleases: state.releases.filter((release) => release.status === "live").length, openFindings: state.findings.length, openConflicts: state.conflicts.filter((conflict) => !conflict.resolvedAt).length, verificationPassRate: reports.length === 0 ? 0 : Math.round(reports.filter((report) => report.status === "passed").length / reports.length * 100), healthEventRate: state.healthEvents.length === 0 ? 0 : Math.round(healthyEvents / state.healthEvents.length * 100) };
}

export function metricSeries(state: ApiState, name: "health" | "verification" | "findings"): readonly { timestamp: string; value: number }[] {
  if (name === "health") return state.healthEvents.map((event) => ({ timestamp: event.observedAt, value: event.status === "healthy" ? 100 : event.status === "degraded" ? 65 : 20 }));
  if (name === "verification") return state.verificationReports.map((report) => ({ timestamp: report.createdAt, value: report.score }));
  return state.scanRuns.map((scan) => ({ timestamp: scan.finishedAt ?? scan.startedAt, value: scan.findingIds.length }));
}

export function percentile(values: readonly number[], percent: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(percent / 100 * sorted.length) - 1));
  return sorted[index] ?? 0;
}

export function latencyMetrics(values: readonly number[]): { p50: number; p95: number; max: number } {
  return { p50: percentile(values, 50), p95: percentile(values, 95), max: Math.max(0, ...values) };
}
