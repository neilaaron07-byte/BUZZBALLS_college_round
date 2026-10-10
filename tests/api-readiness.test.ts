import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { createApiApp, createApiContext } from "../apps/api/src/app";
import { buildCollaborationReport, collaborationNarrative, reviewQueueForStatus, reviewerCanReview } from "../apps/api/src/collaboration-readiness";
import { buildReleaseReadiness, readinessCheckCounts, readinessNarrative } from "../apps/api/src/release-readiness";
import { buildOperatorBrief, operatorBriefActivityCount, operatorBriefNarrative } from "../apps/api/src/operator-brief";
import { buildReleaseDelta, deltaItemsForKind, deltaStatus, releaseDeltaNarrative } from "../apps/api/src/release-delta";
import { buildReleaseSnapshot, snapshotCanRollback, snapshotEvidenceLines, snapshotHasPatch, snapshotHealthTone, snapshotMetricSummary, snapshotPatchCountByStatus, snapshotPatchIds, snapshotPatchSummary, snapshotPolicyTone, snapshotReleaseKey, snapshotStatus, snapshotSummary, verifySnapshotHash } from "../apps/api/src/release-snapshot";
import { createSeedState } from "../apps/api/src/seed";

interface Body<T = unknown> {
  data?: T;
  error?: { code: string; message: string };
}

async function startReadinessApi() {
  const directory = await mkdtemp(join(tmpdir(), "patchwork-readiness-"));
  const context = await createApiContext({ filePath: join(directory, "state.json"), rateLimitPerMinute: 200 });
  const app = createApiApp(context, { rateLimitPerMinute: 200 });
  const server = await new Promise<import("node:http").Server>((resolve) => { const candidate = app.listen(0, "127.0.0.1", () => resolve(candidate)); });
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Readiness test server did not bind.");
  return { baseUrl: `http://127.0.0.1:${address.port}`, server, directory };
}

async function get<T>(baseUrl: string, path: string): Promise<{ response: Response; body: Body<T> }> {
  const response = await fetch(`${baseUrl}${path}`);
  return { response, body: await response.json() as Body<T> };
}

test("release readiness reports policy, manifest, verification, health, audit, and rollback evidence", async () => {
  const state = await createSeedState();
  const report = await buildReleaseReadiness(state, "rel_20261010_03", new Date("2026-10-10T08:00:00.000Z"), "2026-10-10T08:00:00.000Z");
  assert.ok(report);
  assert.equal(report.release.version, "2026.10.10.3");
  assert.equal(report.checks.length, 8);
  assert.equal(report.tone, "amber");
  assert.equal(report.audit.valid, true);
  assert.ok(report.checks.some((item) => item.id === "browser-verification" && item.state === "warning"));
  assert.equal(readinessCheckCounts(report.checks).blocked, 0);
  assert.match(readinessNarrative(report), /Review before shipping/);
});

test("readiness never treats missing or dangerous evidence as green", async () => {
  const state = await createSeedState();
  state.verificationReports = [];
  const missing = await buildReleaseReadiness(state, "rel_20261010_03", new Date("2026-10-10T08:00:00.000Z"));
  assert.ok(missing);
  assert.equal(missing.tone, "amber");
  assert.equal(missing.checks.find((item) => item.id === "browser-verification")?.state, "unknown");
  state.healthEvents.push({ id: "health_readiness_critical", releaseId: "rel_20261010_03", type: "error_rate", status: "critical", observedAt: "2026-10-10T08:02:00.000Z", value: 7, threshold: 2, explanation: "Checkout failures crossed the release boundary." });
  const critical = await buildReleaseReadiness(state, "rel_20261010_03", new Date("2026-10-10T08:00:00.000Z"));
  assert.ok(critical);
  assert.equal(critical.tone, "red");
  assert.equal(critical.checks.find((item) => item.id === "runtime-health")?.state, "blocked");
});

test("collaboration report names the next owner and maps review/check status", async () => {
  const state = await createSeedState();
  const report = buildCollaborationReport(state, "site_shopnest", "2026-10-10T08:00:00.000Z");
  assert.equal(report.siteId, "site_shopnest");
  assert.equal(report.tone, "green");
  assert.equal(report.counts.ready, 1);
  assert.equal(report.pullRequests[0]?.verificationStatus, "passed");
  assert.equal(report.nextOwner?.name, "Jon Bell");
  assert.match(collaborationNarrative(report), /Team is ready to ship/);
  assert.equal(reviewQueueForStatus(report, "ready").length, 1);
  assert.equal(reviewerCanReview("reviewer"), true);
  assert.equal(reviewerCanReview("viewer"), false);
});

test("collaboration report turns draft work and failed checks into red or amber states", async () => {
  const state = await createSeedState();
  const patch = state.patches[0];
  const pullRequest = state.pullRequests[0];
  if (!patch || !pullRequest) throw new Error("Seed collaboration records are missing.");
  state.patches[0] = { ...patch, status: "draft" };
  state.reviews = [];
  state.pullRequests[0] = { ...pullRequest, checks: [{ name: "Playwright verifier", status: "failed", detail: "Checkout action is hidden at mobile width." }] };
  const report = buildCollaborationReport(state, "site_shopnest");
  assert.equal(report.tone, "red");
  assert.equal(report.counts.blocked, 1);
  assert.equal(report.counts.failedChecks, 1);
  assert.equal(report.queue[0]?.status, "blocked");
  assert.match(report.queue[0]?.explanation ?? "", /approval|review/i);
});

test("operator brief joins next action, release evidence, ownership, and rollback posture", async () => {
  const state = await createSeedState();
  const brief = await buildOperatorBrief(state, "site_shopnest", "rel_20261010_03", "2026-10-10T08:00:00.000Z");
  assert.ok(brief);
  assert.equal(brief.site.id, "site_shopnest");
  assert.equal(brief.tone, "amber");
  assert.equal(brief.decision, "review");
  assert.equal(brief.steps.length, 4);
  assert.ok(brief.metrics.some((item) => item.id === "readiness"));
  assert.ok(brief.blockers.length > 0);
  assert.ok(brief.evidenceLinks.some((link) => link.label === "Audit chain"));
  assert.equal(operatorBriefActivityCount(brief), brief.timeline.length);
  assert.match(operatorBriefNarrative(brief), /ShopNest/);
  state.healthEvents.push({ id: "health_brief_critical", releaseId: "rel_20261010_03", type: "error_rate", status: "critical", observedAt: "2026-10-10T08:02:00.000Z", value: 7, threshold: 2, explanation: "Checkout failures crossed the release boundary." });
  const rollback = await buildOperatorBrief(state, "site_shopnest", "rel_20261010_03", "2026-10-10T08:00:00.000Z");
  assert.equal(rollback?.decision, "rollback");
});

test("release delta explains changed and unchanged candidate signals", async () => {
  const state = await createSeedState();
  const delta = await buildReleaseDelta(state, "rel_20261010_03", "rel_20261009_02", "2026-10-10T08:00:00.000Z");
  assert.ok(delta);
  assert.equal(delta.current.id, "rel_20261010_03");
  assert.equal(delta.candidate.id, "rel_20261009_02");
  assert.ok(delta.items.some((item) => item.id === "manifest" && item.kind === "changed"));
  assert.ok(deltaItemsForKind(delta, "unchanged").length > 0);
  assert.equal(deltaStatus(delta), "regressed");
  assert.match(releaseDeltaNarrative(delta), /riskier|not materially safer|safer/);
  const missing = await buildReleaseDelta(state, "rel_20261010_03", "release_missing", "2026-10-10T08:00:00.000Z");
  assert.equal(missing, null);
});

test("release snapshot is content-hashed and preserves patch membership for offline handoff", async () => {
  const state = await createSeedState();
  const snapshot = await buildReleaseSnapshot(state, "rel_20261010_03", "2026-10-10T08:00:00.000Z");
  assert.ok(snapshot);
  assert.equal(snapshot.schemaVersion, 1);
  assert.match(snapshot.snapshotHash, /^sha256-[a-f0-9]{64}$/);
  assert.deepEqual(snapshotPatchIds(snapshot), ["patch_price_contrast"]);
  assert.equal(snapshotStatus(snapshot), "amber");
  assert.match(snapshotSummary(snapshot), /2026\.10\.10\.3/);
  assert.equal(snapshot.audit.valid, true);
  assert.equal(await verifySnapshotHash(snapshot), true);
  assert.equal(snapshotReleaseKey(snapshot), "site_shopnest:production:rel_20261010_03");
  assert.equal(snapshotHasPatch(snapshot, "patch_price_contrast"), true);
  assert.equal(snapshotHealthTone(snapshot), "green");
  assert.equal(snapshotMetricSummary(snapshot).patchCount, 1);
  assert.equal(snapshotEvidenceLines(snapshot).length, 5);
  assert.equal(snapshotCanRollback(snapshot), true);
  assert.equal(snapshotPolicyTone(snapshot), "green");
  assert.equal(snapshotPatchSummary(snapshot)[0]?.operationCount, 1);
  assert.equal(snapshotPatchCountByStatus(snapshot).verified, 1);
  assert.equal(await buildReleaseSnapshot(state, "release_missing"), null);
});

test("readiness and collaboration routes expose JSON and CSV contracts", async () => {
  const api = await startReadinessApi();
  try {
    const readiness = await get<{ tone: string; checks: Array<{ id: string }> }>(api.baseUrl, "/api/releases/rel_20261010_03/readiness");
    assert.equal(readiness.response.status, 200);
    assert.ok(readiness.body.data?.checks.some((item) => item.id === "audit-chain"));
    const comparison = await get<{ scoreDelta: number }>(api.baseUrl, "/api/releases/rel_20261010_03/readiness/compare?with=rel_20261009_02");
    assert.equal(comparison.response.status, 200);
    assert.equal(typeof comparison.body.data?.scoreDelta, "number");
    const missing = await get(api.baseUrl, "/api/releases/rel_20261010_03/readiness/compare");
    assert.equal(missing.response.status, 400);
    assert.equal(missing.body.error?.code, "CANDIDATE_RELEASE_REQUIRED");
    const csv = await fetch(`${api.baseUrl}/api/releases/rel_20261010_03/readiness.csv`);
    assert.equal(csv.status, 200);
    assert.match(await csv.text(), /check,state,tone/);
    const collaboration = await get<{ counts: { ready: number } }>(api.baseUrl, "/api/sites/site_shopnest/collaboration");
    assert.equal(collaboration.response.status, 200);
    assert.equal(collaboration.body.data?.counts.ready, 1);
    const collaborationCsv = await fetch(`${api.baseUrl}/api/sites/site_shopnest/collaboration.csv`);
    assert.equal(collaborationCsv.status, 200);
    assert.match(await collaborationCsv.text(), /patch,status,tone/);
    const brief = await get<{ decision: string; steps: Array<{ id: string }> }>(api.baseUrl, "/api/sites/site_shopnest/operator-brief?releaseId=rel_20261010_03");
    assert.equal(brief.response.status, 200);
    assert.equal(brief.body.data?.steps.length, 4);
    assert.equal(brief.body.data?.decision, "review");
    const briefCsv = await fetch(`${api.baseUrl}/api/sites/site_shopnest/operator-brief.csv?releaseId=rel_20261010_03`);
    assert.equal(briefCsv.status, 200);
    assert.match(await briefCsv.text(), /section,label,value,tone,explanation/);
    const delta = await get<{ changedCount: number; items: Array<{ id: string }> }>(api.baseUrl, "/api/releases/rel_20261010_03/delta?with=rel_20261009_02");
    assert.equal(delta.response.status, 200);
    assert.ok((delta.body.data?.changedCount ?? 0) > 0);
    assert.ok(delta.body.data?.items.some((item) => item.id === "health"));
    const deltaCsv = await fetch(`${api.baseUrl}/api/releases/rel_20261010_03/delta.csv?with=rel_20261009_02`);
    assert.equal(deltaCsv.status, 200);
    assert.match(await deltaCsv.text(), /field,kind,current,candidate,explanation/);
    const snapshot = await get<{ snapshotHash: string; patches: Array<{ id: string }> }>(api.baseUrl, "/api/releases/rel_20261010_03/snapshot");
    assert.equal(snapshot.response.status, 200);
    assert.match(snapshot.body.data?.snapshotHash ?? "", /^sha256-/);
    assert.equal(snapshot.body.data?.patches[0]?.id, "patch_price_contrast");
    const snapshotCsv = await fetch(`${api.baseUrl}/api/releases/rel_20261010_03/snapshot.csv`);
    assert.equal(snapshotCsv.status, 200);
    assert.match(await snapshotCsv.text(), /snapshotHash/);
  } finally {
    await new Promise<void>((resolve) => api.server.close(() => resolve()));
    await rm(api.directory, { recursive: true, force: true });
  }
});
