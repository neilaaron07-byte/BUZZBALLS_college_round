import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { createApiApp, createApiContext } from "../apps/api/src/app";
import { JsonRepository } from "../apps/api/src/store";
import { createSeedState } from "../apps/api/src/seed";

interface ResponseBody<T = unknown> {
  data?: T;
  error?: { code: string; message: string; requestId: string };
  requestId?: string;
}

async function startApi() {
  const directory = await mkdtemp(join(tmpdir(), "patchwork-api-"));
  const context = await createApiContext({ filePath: join(directory, "state.json"), rateLimitPerMinute: 200 });
  const app = createApiApp(context, { rateLimitPerMinute: 200 });
  const server = await new Promise<import("node:http").Server>((resolve) => { const candidate = app.listen(0, "127.0.0.1", () => resolve(candidate)); });
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("API test server did not bind to a TCP port.");
  return { baseUrl: `http://127.0.0.1:${address.port}`, server, directory };
}

async function request<T>(baseUrl: string, path: string, init?: RequestInit): Promise<{ response: Response; body: ResponseBody<T> }> {
  const response = await fetch(`${baseUrl}${path}`, init);
  const body = await response.json() as ResponseBody<T>;
  return { response, body };
}

test("API exposes readiness, seeded sites, environments, findings, and metrics", async () => {
  const api = await startApi();
  try {
    const health = await request<{ status: string }>(api.baseUrl, "/healthz");
    assert.equal(health.response.status, 200);
    assert.equal(health.body.data?.status, "ok");
    const ready = await request<{ status: string }>(api.baseUrl, "/readyz");
    assert.equal(ready.body.data?.status, "ready");
    const sites = await request<Array<{ id: string }>>(api.baseUrl, "/api/sites");
    assert.equal(sites.body.data?.[0]?.id, "site_shopnest");
    const environments = await request<Array<{ name: string }>>(api.baseUrl, "/api/sites/site_shopnest/environments");
    assert.deepEqual(environments.body.data?.map((environment) => environment.name), ["preview", "staging", "production"]);
    const findings = await request<Array<{ id: string }>>(api.baseUrl, "/api/sites/site_shopnest/findings");
    assert.equal(findings.body.data?.[0]?.id, "finding_price_contrast");
    const metrics = await request<{ activeSites: number }>(api.baseUrl, "/metrics");
    assert.equal(metrics.body.data?.activeSites, 1);
  } finally {
    await new Promise<void>((resolve) => api.server.close(() => resolve()));
    await rm(api.directory, { recursive: true, force: true });
  }
});

test("patch creation is validated, hashed, reviewable, and idempotent", async () => {
  const api = await startApi();
  try {
    const payload = { siteId: "site_shopnest", authorId: "usr_maya_singh", title: "Restore checkout focus", description: "Moves focus back to the checkout action after the cart drawer closes.", targetFingerprint: `sha256-${"f".repeat(64)}`, operations: [{ id: "op_focus", kind: "attribute", target: { fingerprint: `sha256-${"f".repeat(64)}`, fallbackLabel: "Checkout", expectedTag: "button" }, name: "aria-describedby", value: "checkout-help" }], tags: ["checkout", "a11y"] };
    const first = await request<{ identity: { id: string }; revision: { contentHash: string } }>(api.baseUrl, "/api/patches", { method: "POST", headers: { "content-type": "application/json", "idempotency-key": "patch-create-1" }, body: JSON.stringify(payload) });
    assert.equal(first.response.status, 201);
    assert.match(first.body.data?.revision.contentHash ?? "", /^sha256-[a-f0-9]{64}$/);
    const replay = await request<{ identity: { id: string } }>(api.baseUrl, "/api/patches", { method: "POST", headers: { "content-type": "application/json", "idempotency-key": "patch-create-1" }, body: JSON.stringify(payload) });
    assert.equal(replay.response.status, 201);
    assert.equal(replay.body.data?.identity.id, first.body.data?.identity.id);
    const review = await request<{ decision: string }>(api.baseUrl, `/api/patches/${first.body.data?.identity.id}/reviews`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ authorId: "usr_jon_bell", decision: "approved", note: "The target and operation are explicit and reversible." }) });
    assert.equal(review.response.status, 201);
    assert.equal(review.body.data?.decision, "approved");
    const preview = await request<{ manifest: { environment: string }; previewUrl: string }>(api.baseUrl, `/api/patches/${first.body.data?.identity.id}/preview`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ttlMinutes: 20 }) });
    assert.equal(preview.response.status, 201);
    assert.equal(preview.body.data?.manifest.environment, "preview");
    assert.match(preview.body.data?.previewUrl ?? "", /preview\.patchwork/);
  } finally {
    await new Promise<void>((resolve) => api.server.close(() => resolve()));
    await rm(api.directory, { recursive: true, force: true });
  }
});

test("conflicts, verifier replay, canary controls, and automatic rollback are reachable", async () => {
  const api = await startApi();
  try {
    const conflict = await request<{ id: string }[]>(api.baseUrl, "/api/conflicts");
    assert.equal(conflict.body.data?.[0]?.id, "conflict_price_color");
    const resolved = await request<{ resolvedBy: string | null }>(api.baseUrl, "/api/conflicts/conflict_price_color/resolve", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ authorId: "usr_maya_singh", action: "archive" }) });
    assert.equal(resolved.body.data?.resolvedBy, "usr_maya_singh");
    const runs = await request<Array<{ id: string }>>(api.baseUrl, "/api/verification-runs");
    assert.equal(runs.body.data?.[0]?.id, "verify_rel_20261010_03");
    const replay = await request<{ replayed: boolean }>(api.baseUrl, "/api/verification-runs/verify_rel_20261010_03/replay", { method: "POST" });
    assert.equal(replay.body.data?.replayed, true);
    const canary = await request<{ canaryPercent: number }>(api.baseUrl, "/api/releases/rel_20261010_03/canary", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ percent: 50 }) });
    assert.equal(canary.body.data?.canaryPercent, 50);
    const kill = await request<{ killSwitch: { enabled: boolean } }>(api.baseUrl, "/api/releases/rel_20261010_03/kill-switch", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ enabled: true, reason: "Checkout error spike during canary." }) });
    assert.equal(kill.body.data?.killSwitch.enabled, true);
    const health = await request<{ automaticRollback: boolean; release: { status: string } }>(api.baseUrl, "/api/health-events", { method: "POST", headers: { "content-type": "application/json", "idempotency-key": "health-event-1" }, body: JSON.stringify({ id: "health_critical_01", releaseId: "rel_20261010_03", type: "error_rate", status: "critical", observedAt: "2026-10-10T08:01:00.000Z", value: 6, threshold: 2, explanation: "Checkout errors crossed the canary threshold." }) });
    assert.equal(health.response.status, 202);
    assert.equal(health.body.data?.automaticRollback, true);
    assert.equal(health.body.data?.release.status, "rolled_back");
    const tamper = await request<{ tamperDetected: boolean }>(api.baseUrl, "/api/audit/tamper-test", { method: "POST" });
    assert.equal(tamper.body.data?.tamperDetected, true);
  } finally {
    await new Promise<void>((resolve) => api.server.close(() => resolve()));
    await rm(api.directory, { recursive: true, force: true });
  }
});

test("scan lifecycle stores findings, revision history, collaborator roles, policy checks, and paginated results", async () => {
  const api = await startApi();
  try {
    const scan = await request<{ id: string; status: string; findingIds: string[] }>(api.baseUrl, "/api/scans", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ siteId: "site_shopnest", pageUrl: "https://shopnest.example/products/aurora", snapshot: { pageUrl: "https://shopnest.example/products/aurora", viewport: { width: 390, height: 844 }, elements: [{ id: "price", tag: "p", text: "$248", visible: true, region: "middle-center", rect: { left: 20, top: 100, right: 120, bottom: 130 }, styles: { foreground: "#777777", background: "#ffffff", fontSizePx: 16, fontWeight: 400 } }] } }) });
    assert.equal(scan.response.status, 201);
    assert.equal(scan.body.data?.status, "completed");
    assert.equal(scan.body.data?.findingIds.length, 1);
    const run = await request<{ id: string }>(api.baseUrl, `/api/scans/${scan.body.data?.id}`);
    assert.equal(run.body.data?.id, scan.body.data?.id);
    const findings = await request<Array<{ id: string }>>(api.baseUrl, `/api/scans/${scan.body.data?.id}/findings`);
    assert.equal(findings.body.data?.length, 1);
    const scans = await request<{ items: Array<{ id: string }>; total: number }>(api.baseUrl, "/api/sites/site_shopnest/scans?limit=1");
    assert.equal(scans.body.data?.items.length, 1);
    assert.equal(scans.body.data?.total, 2);

    const revisions = await request<{ revision: number }>(api.baseUrl, "/api/patches/patch_price_contrast/revisions", { method: "POST", headers: { "content-type": "application/json", "idempotency-key": "revision-1" }, body: JSON.stringify({ authorId: "usr_maya_singh", baseRevision: 2, message: "Keep the semantic price target while refining the approved color.", operations: [{ id: "op_price_color_v2", kind: "style", target: { fingerprint: `sha256-${"b".repeat(64)}`, fallbackLabel: "Aurora price", expectedTag: "p" }, property: "color", value: "#132038" }] }) });
    assert.equal(revisions.response.status, 201);
    assert.equal(revisions.body.data?.revision, 3);
    const history = await request<Array<{ revision: number }>>(api.baseUrl, "/api/patches/patch_price_contrast/revisions");
    assert.deepEqual(history.body.data?.map((revision) => revision.revision), [2, 3]);
    const stale = await request(api.baseUrl, "/api/patches/patch_price_contrast/revisions", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ authorId: "usr_maya_singh", baseRevision: 2, message: "Stale edit", operations: [{ id: "op_stale", kind: "style", target: { fingerprint: `sha256-${"b".repeat(64)}`, fallbackLabel: "Aurora price", expectedTag: "p" }, property: "color", value: "#000000" }] }) });
    assert.equal(stale.response.status, 409);

    const collaborator = await request<{ role: string }>(api.baseUrl, "/api/sites/site_shopnest/collaborators/usr_lena_ortiz", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ role: "reviewer" }) });
    assert.equal(collaborator.body.data?.role, "reviewer");
    const policy = await request<{ status: string; checks: Array<{ id: string }> }>(api.baseUrl, "/api/releases/rel_20261010_03/policy");
    assert.ok(["passed", "warning", "blocked"].includes(policy.body.data?.status ?? ""));
    assert.ok(policy.body.data?.checks.some((check) => check.id === "conflicts"));
  } finally {
    await new Promise<void>((resolve) => api.server.close(() => resolve()));
    await rm(api.directory, { recursive: true, force: true });
  }
});

test("API uses a consistent safe error envelope and the JSON repository recovers from corruption", async () => {
  const api = await startApi();
  try {
    const missing = await request(api.baseUrl, "/api/not-a-route");
    assert.equal(missing.response.status, 404);
    assert.equal(missing.body.error?.code, "ROUTE_NOT_FOUND");
    const invalid = await request(api.baseUrl, "/api/patches", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ title: "incomplete" }) });
    assert.equal(invalid.response.status, 400);
    assert.ok(invalid.body.error?.requestId);
  } finally {
    await new Promise<void>((resolve) => api.server.close(() => resolve()));
    await rm(api.directory, { recursive: true, force: true });
  }

  const directory = await mkdtemp(join(tmpdir(), "patchwork-store-"));
  const filePath = join(directory, "state.json");
  try {
    const repository = new JsonRepository({ filePath, initial: { version: 1, label: "seed" } });
    await repository.write({ version: 1, label: "first" });
    await repository.write({ version: 1, label: "second" });
    await writeFile(filePath, "{ broken", "utf8");
    const recovered = await repository.read();
    assert.equal(recovered.label, "first");
    assert.match(await readFile(filePath, "utf8"), /first/);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("seed generation is deterministic and includes a valid audit chain", async () => {
  const first = await createSeedState();
  const second = await createSeedState();
  assert.deepEqual(first.sites, second.sites);
  assert.deepEqual(first.auditEntries, second.auditEntries);
  assert.equal(first.releases.find((release) => release.status === "live")?.id, "rel_20261010_03");
});
