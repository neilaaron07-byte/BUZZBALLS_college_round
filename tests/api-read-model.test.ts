import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { createApiApp, createApiContext } from "../apps/api/src/app";
import { buildTimeline, filterTimeline, parseTimelineFilters, timelineHasCritical, timelineStageCounts, toTimelineEvent } from "../apps/api/src/activity-timeline";
import { buildFixStage, buildScanStage, buildShipStage, buildWorkspaceReadModel, patchStatusTone, rolloutHealth, stageOrder, summarizeStages, workspaceActions } from "../apps/api/src/workspace-read-model";
import { createSeedState } from "../apps/api/src/seed";
import type { ApiState } from "../apps/api/src/types";

interface Body<T = unknown> {
  data?: T;
  error?: { code: string; message: string };
}

async function startReadModelApi() {
  const directory = await mkdtemp(join(tmpdir(), "patchwork-read-model-"));
  const context = await createApiContext({ filePath: join(directory, "state.json"), rateLimitPerMinute: 200 });
  const app = createApiApp(context, { rateLimitPerMinute: 200 });
  const server = await new Promise<import("node:http").Server>((resolve) => { const candidate = app.listen(0, "127.0.0.1", () => resolve(candidate)); });
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Read-model test server did not bind.");
  return { baseUrl: `http://127.0.0.1:${address.port}`, server, directory };
}

async function get<T>(baseUrl: string, path: string): Promise<{ response: Response; body: Body<T> }> {
  const response = await fetch(`${baseUrl}${path}`);
  return { response, body: await response.json() as Body<T> };
}

async function closeReadModelApi(api: Awaited<ReturnType<typeof startReadModelApi>>): Promise<void> {
  await new Promise<void>((resolve) => api.server.close(() => resolve()));
  await rm(api.directory, { recursive: true, force: true });
}

test("workspace read model explains SCAN, FIX, and SHIP in plain English", async () => {
  const state = await createSeedState();
  const model = buildWorkspaceReadModel(state, "site_shopnest", "2026-10-10T08:00:00.000Z");
  assert.equal(model.site.id, "site_shopnest");
  assert.deepEqual(Object.keys(model.stages), ["scan", "fix", "ship"]);
  assert.equal(model.stages.scan.tone, "amber");
  assert.equal(model.stages.fix.tone, "amber");
  assert.equal(model.stages.ship.tone, "green");
  assert.equal(model.risk.tone, "amber");
  assert.ok(model.nextAction.explanation.length > 20);
  assert.match(summarizeStages(model.stages), /SCAN is amber/);
  assert.deepEqual(stageOrder(), ["scan", "fix", "ship"]);
  assert.equal(model.findings[0]?.id, "finding_price_contrast");
  assert.equal(model.patches[0]?.id, "patch_price_contrast");
  assert.equal(model.policy?.releaseId, "rel_20261010_03");
});

test("read model prioritizes blocking conflicts and critical health signals", async () => {
  const state = await createSeedState();
  const firstConflict = state.conflicts[0];
  if (!firstConflict) throw new Error("Seed conflict is missing.");
  state.conflicts[0] = { ...firstConflict, severity: "blocking" };
  state.healthEvents.push({ id: "health_critical_read_model", releaseId: "rel_20261010_03", type: "error_rate", status: "critical", observedAt: "2026-10-10T08:02:00.000Z", value: 8, threshold: 2, explanation: "The checkout error rate crossed the release boundary." });
  const model = buildWorkspaceReadModel(state, "site_shopnest");
  assert.equal(model.stages.fix.tone, "red");
  assert.equal(model.stages.ship.tone, "red");
  assert.equal(model.nextAction.id, "protect-release");
  assert.equal(model.nextAction.stage, "ship");
  assert.equal(model.risk.tone, "red");
  assert.match(model.risk.explanation, /workflow action/);
});

test("pure stage helpers expose stable status language for edge states", async () => {
  const state = await createSeedState();
  const empty: ApiState = { ...state, scanRuns: [], findings: [], patches: [], conflicts: [], releases: [], rollouts: [] };
  const scan = buildScanStage(empty, "site_shopnest");
  const fix = buildFixStage(empty, "site_shopnest");
  const ship = buildShipStage(empty, "site_shopnest");
  assert.equal(scan.tone, "green");
  assert.equal(fix.tone, "green");
  assert.equal(ship.tone, "amber");
  assert.equal(workspaceActions({ scan, fix, ship }).length, 1);
  assert.equal(workspaceActions({ scan, fix, ship })[0]?.id, "review-release");
  const firstPatch = state.patches[0];
  const firstRollout = state.rollouts[0];
  if (!firstPatch || !firstRollout) throw new Error("Seed patch or rollout is missing.");
  assert.equal(patchStatusTone(firstPatch), "green");
  assert.equal(rolloutHealth(state, firstRollout), "green");
});

test("timeline filters preserve deterministic cursors and plain-English event context", async () => {
  const state = await createSeedState();
  const timeline = buildTimeline(state, "site_shopnest", { limit: 2 });
  assert.equal(timeline.items.length, 2);
  assert.equal(timeline.total > timeline.items.length, true);
  assert.ok(timeline.nextCursor);
  assert.equal(timeline.items[0]?.cursor.includes("::"), true);
  assert.ok(timeline.items[0]?.plainEnglish.includes("SCAN") || timeline.items[0]?.plainEnglish.includes("FIX") || timeline.items[0]?.plainEnglish.includes("SHIP"));
  const next = buildTimeline(state, "site_shopnest", { limit: 20, cursor: timeline.nextCursor ?? undefined });
  assert.equal(next.items.some((item) => item.cursor === timeline.items[0]?.cursor), false);
  const scans = buildTimeline(state, "site_shopnest", { stage: "scan", limit: 100 });
  assert.ok(scans.items.every((item) => item.stage === "scan"));
  assert.equal(timelineStageCounts(scans.items).fix, 0);
  assert.equal(timelineHasCritical(scans.items), false);
});

test("timeline query parser rejects unsafe ranges and supports status filters", async () => {
  assert.throws(() => parseTimelineFilters({ limit: "0" }), /between 1 and 100/);
  assert.throws(() => parseTimelineFilters({ stage: "deploy" }), /scan, fix, or ship/);
  assert.throws(() => parseTimelineFilters({ from: "not-a-date" }), /ISO date/);
  const filters = parseTimelineFilters({ q: "Aurora", tone: "amber", from: "2026-10-10T07:00:00.000Z", to: "2026-10-10T09:00:00.000Z", limit: "4" });
  assert.deepEqual(filters, { query: "aurora", stage: undefined, tone: "amber", from: "2026-10-10T07:00:00.000Z", to: "2026-10-10T09:00:00.000Z", limit: 4, cursor: undefined });
  const event = toTimelineEvent({ id: "activity_1", timestamp: "2026-10-10T08:00:00.000Z", type: "finding", title: "Aurora", detail: "Price needs review", severity: "warning", subjectId: "finding_1" });
  assert.equal(filterTimeline([event], filters).length, 1);
});

test("API exposes workspace, cursor timeline, CSV export, and safe query errors", async () => {
  const api = await startReadModelApi();
  try {
    const workspace = await get<{ stages: { scan: { label: string } }; nextAction: { label: string } }>(api.baseUrl, "/api/sites/site_shopnest/workspace");
    assert.equal(workspace.response.status, 200);
    assert.equal(workspace.body.data?.stages.scan.label, "SCAN");
    assert.ok(workspace.body.data?.nextAction.label);
    const first = await get<{ items: Array<{ cursor: string }>; nextCursor: string | null }>(api.baseUrl, "/api/sites/site_shopnest/timeline?limit=1");
    assert.equal(first.response.status, 200);
    assert.equal(first.body.data?.items.length, 1);
    const cursor = first.body.data?.nextCursor;
    assert.ok(cursor);
    const second = await get<{ items: Array<{ cursor: string }> }>(api.baseUrl, `/api/sites/site_shopnest/timeline?limit=1&cursor=${encodeURIComponent(cursor ?? "")}`);
    assert.equal(second.response.status, 200);
    assert.notEqual(second.body.data?.items[0]?.cursor, first.body.data?.items[0]?.cursor);
    const csv = await fetch(`${api.baseUrl}/api/sites/site_shopnest/timeline.csv?stage=scan`);
    assert.equal(csv.status, 200);
    assert.match(await csv.text(), /timestamp,stage,tone,action,subject,explanation/);
    const invalid = await get(api.baseUrl, "/api/sites/site_shopnest/timeline?tone=purple");
    assert.equal(invalid.response.status, 400);
    assert.equal(invalid.body.error?.code, "INVALID_TIMELINE_TONE");
  } finally {
    await closeReadModelApi(api);
  }
});
