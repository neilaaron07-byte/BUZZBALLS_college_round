import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { createApiApp, createApiContext } from "../apps/api/src/app";

interface Envelope<T> { data?: T; error?: { code: string; message: string } }

test("live proposals preserve inverses and runtime ship actions require a connected SDK", async () => {
  const directory = await mkdtemp(join(tmpdir(), "patchwork-runtime-boundary-"));
  const context = await createApiContext({ filePath: join(directory, "state.json"), rateLimitPerMinute: 200 });
  const app = createApiApp(context, { rateLimitPerMinute: 200 });
  const server = await new Promise<import("node:http").Server>((resolve) => { const candidate = app.listen(0, "127.0.0.1", () => resolve(candidate)); });
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Runtime boundary test server did not bind.");
  const baseUrl = `http://127.0.0.1:${address.port}`;
  const target = { fingerprint: `sha256-${"f".repeat(64)}`, fallbackLabel: "Aurora price", expectedTag: "p" };
  const operation = { id: "op_live_color", kind: "style" as const, target, property: "color" as const, value: "#172033" };
  const inverse = { ...operation, id: "op_live_color_inverse", value: "#777777" };
  async function request<T>(path: string, init?: RequestInit): Promise<{ response: Response; payload: Envelope<T> }> {
    const response = await fetch(`${baseUrl}${path}`, init);
    return { response, payload: await response.json() as Envelope<T> };
  }
  try {
    const proposal = await request<{ runtimeRequired: boolean; inverseOperations: Array<{ id: string }> }>("/api/v1/live-sites/site_shopnest/patches/proposals", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ siteId: "site_shopnest", authorId: "usr_maya_singh", title: "Restore readable pricing", description: "Raise contrast on the price without changing the source application.", targetFingerprint: target.fingerprint, operations: [operation], inverseOperations: [inverse], tags: ["live", "contrast"] }) });
    assert.equal(proposal.response.status, 201);
    assert.equal(proposal.payload.data?.runtimeRequired, true);
    assert.equal(proposal.payload.data?.inverseOperations[0]?.id, "op_live_color_inverse");
    const beforeHandshake = await request<{ status: string }>("/api/v1/sites/site_shopnest/runtime");
    assert.equal(beforeHandshake.payload.data?.status, "not_installed");
    const handshake = await request<{ status: string; sdkVersion: string }>("/api/v1/sites/site_shopnest/runtime/handshake", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ origin: "https://shopnest.example", sdkVersion: "0.1.0", manifestHash: `sha256-${"a".repeat(64)}` }) });
    assert.equal(handshake.payload.data?.status, "connected");
    const paused = await request<{ boundary: string; action: string }>("/api/v1/live-sites/site_shopnest/releases/rel_20261010_03/ship", { method: "POST", headers: { "content-type": "application/json", "idempotency-key": "runtime-pause-1" }, body: JSON.stringify({ action: "pause", reason: "Owner is reviewing the live patch.", humanApproval: "confirmed" }) });
    assert.equal(paused.response.status, 200);
    assert.equal(paused.payload.data?.boundary, "sdk_runtime");
    assert.equal(paused.payload.data?.action, "pause");
    const reset = await request<{ reset: boolean; sites: number }>("/demo/reset", { method: "POST" });
    assert.equal(reset.response.status, 200);
    assert.equal(reset.payload.data?.reset, true);
    assert.equal(reset.payload.data?.sites, 1);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await rm(directory, { recursive: true, force: true });
  }
});

test("PatchPilot API streams offline evidence and never exposes a publish tool", async () => {
  const directory = await mkdtemp(join(tmpdir(), "patchwork-ai-stream-"));
  const context = await createApiContext({ filePath: join(directory, "state.json"), rateLimitPerMinute: 200 });
  const app = createApiApp(context, { rateLimitPerMinute: 200 });
  const server = await new Promise<import("node:http").Server>((resolve) => { const candidate = app.listen(0, "127.0.0.1", () => resolve(candidate)); });
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("AI stream test server did not bind.");
  try {
    const response = await fetch(`http://127.0.0.1:${address.port}/api/v1/ai/stream`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ intent: "summarize", context: { pageUrl: "https://shopnest.example/products/aurora" }, question: "Is this ready?" }) });
    const text = await response.text();
    assert.equal(response.status, 200);
    assert.match(text, /event: meta/);
    assert.match(text, /event: token/);
    assert.match(text, /event: complete/);
    assert.doesNotMatch(text, /publish|rollback|delete/);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await rm(directory, { recursive: true, force: true });
  }
});
