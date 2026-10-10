import assert from "node:assert/strict";
import test from "node:test";
import { cloneFixture } from "../apps/dashboard/src/fixture";
import {
  activityTone,
  activityTypeLabel,
  applyRolloutIntent,
  blastRadiusLabel,
  clampCanary,
  compactCount,
  confidenceLabel,
  dashboardCsv,
  emptyDashboardQuery,
  evidenceNarrative,
  filterActivities,
  filterFindings,
  filterPatches,
  formatAge,
  findingSeverityRank,
  nextBestAction,
  parseDashboardQuery,
  patchNarrative,
  patchTone,
  policyChecks,
  readinessLabel,
  releaseNarrative,
  releaseStatusLabel,
  rolloutDecision,
  rolloutState,
  scoreLabel,
  searchFindings,
  searchPatches,
  serializeDashboardQuery,
  stageIndex,
  stageLabel,
  stageProgress,
  toneForScore,
  workspaceExport,
  workspaceMetrics,
} from "../apps/dashboard/src/dashboard-engine";

test("dashboard query state keeps safe defaults and round-trips visible filters", () => {
  assert.deepEqual(parseDashboardQuery(""), emptyDashboardQuery());
  const query = parseDashboardQuery("?view=releases&q=price%20contrast&finding=open&activity=review");
  assert.deepEqual(query, { view: "releases", query: "price contrast", finding: "open", activity: "review" });
  assert.equal(serializeDashboardQuery(query), "?view=releases&q=price+contrast&finding=open&activity=review");
  assert.equal(parseDashboardQuery("?view=untrusted&finding=deploy").view, "overview");
});

test("stage and score helpers use plain, stable operator language", () => {
  const data = cloneFixture();
  assert.equal(stageIndex("scan"), 0);
  assert.equal(stageIndex("ship"), 2);
  assert.equal(stageLabel("fix"), "FIX");
  assert.ok(stageProgress(data.workspace.stages.scan) >= data.workspace.stages.scan.score - 20);
  assert.equal(scoreLabel(98), "Excellent");
  assert.equal(scoreLabel(70), "Review");
  assert.equal(toneForScore(90), "green");
  assert.equal(toneForScore(50), "red");
});

test("finding filters preserve severity order, search, and explicit review state", () => {
  const data = cloneFixture();
  const findings = data.workspace.findings;
  const reviewed = new Set<string>();
  assert.equal(filterFindings(findings, "all", reviewed).length, 1);
  assert.equal(filterFindings(findings, "open", reviewed)[0]?.id, "finding_price_contrast");
  reviewed.add("finding_price_contrast");
  assert.equal(filterFindings(findings, "reviewed", reviewed)[0]?.id, "finding_price_contrast");
  assert.equal(filterFindings(findings, "open", reviewed).length, 0);
  assert.equal(searchFindings(findings, "contrast").length, 1);
  assert.equal(findingSeverityRank(findings[0]!), 2);
  assert.equal(confidenceLabel(.99), "Very high");
  assert.equal(blastRadiusLabel(findings[0]!), "Contained");
  assert.match(evidenceNarrative(findings[0]!), /Very high confidence/);
});

test("patch filters expose safe review states and owner context", () => {
  const data = cloneFixture();
  const patch = data.workspace.patches[0]!;
  assert.equal(filterPatches(data.workspace.patches, "verified").length, 1);
  assert.equal(filterPatches(data.workspace.patches, "needs-review").length, 0);
  assert.equal(patchTone(patch), "green");
  assert.match(patchNarrative(patch), /Maya Singh/);
  assert.equal(searchPatches(data.workspace.patches, "contrast").length, 1);
  assert.equal(searchPatches(data.workspace.patches, "missing").length, 0);
});

test("workspace metrics and policy checks explain why shipping is ready or held", () => {
  const data = cloneFixture();
  const metrics = workspaceMetrics(data.workspace);
  assert.deepEqual(metrics, { findingCount: 1, criticalFindingCount: 0, verifiedPatchCount: 1, openConflictCount: 1, reviewCount: 2, canaryPercent: 25, healthScore: 91, readiness: "review" });
  assert.equal(readinessLabel(metrics.readiness), "Review before shipping");
  assert.equal(policyChecks(data.workspace).length, 4);
  assert.match(releaseNarrative(data.workspace.release, metrics), /25% canary/);
  assert.equal(releaseStatusLabel(data.workspace.release), "Review");
  assert.equal(nextBestAction(data.workspace.actions)?.id, "review-scan-findings");
});

test("rollout decisions block premature promotion and preserve rollback paths", () => {
  const data = cloneFixture();
  const metrics = workspaceMetrics(data.workspace);
  const state = rolloutState(data.workspace.release);
  const decision = rolloutDecision(state, "promote", metrics);
  assert.equal(decision.allowed, false);
  assert.match(decision.detail, /bounded|finding|conflict/i);
  assert.equal(clampCanary(63), 75);
  assert.equal(clampCanary(111), 100);
  assert.equal(clampCanary(-4), 0);
  const paused = applyRolloutIntent(state, "pause", metrics);
  assert.equal(paused.paused, true);
  const resumed = applyRolloutIntent(paused, "resume", metrics);
  assert.equal(resumed.paused, false);
  const killed = applyRolloutIntent(state, "kill-switch", metrics);
  assert.equal(killed.killSwitchEnabled, true);
  assert.equal(killed.paused, true);
});

test("activity filtering and exports stay deterministic and credential-free", () => {
  const data = cloneFixture();
  assert.equal(filterActivities(data, "health").length, 2);
  assert.equal(filterActivities(data, "all", "contrast").length, 3);
  assert.equal(activityTone("finding", "warning"), "amber");
  assert.equal(activityTone("health", "info"), "green");
  assert.equal(activityTypeLabel("review"), "Review");
  assert.equal(formatAge("2026-10-10T07:58:00.000Z"), "2m ago");
  assert.equal(compactCount(1, "finding"), "1 finding");
  assert.equal(compactCount(2, "finding"), "2 findings");
  const csv = workspaceExport(data);
  assert.match(csv, /timestamp,type,title,detail,subject/);
  assert.doesNotMatch(csv, /token|secret|password/i);
  assert.equal(dashboardCsv([]), "");
  assert.equal(dashboardCsv([{ name: "Maya", value: 2 }]), "name,value\n\"Maya\",\"2\"");
});
