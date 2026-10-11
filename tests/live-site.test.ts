import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { createApiApp, createApiContext } from "../apps/api/src/app";
import { fetchLivePage, extractLiveSnapshot, getLiveScanJob, sanitizeLivePreviewHtml, startLiveScan, validateLiveSiteUrl } from "../apps/api/src/live-site";

const publicLookup = async (): Promise<readonly { address: string; family: number }[]> => [{ address: "93.184.216.34", family: 4 }];

test("live URL validation blocks credentials, private hosts, private DNS, and non-web ports", async () => {
  await assert.rejects(() => validateLiveSiteUrl("http://localhost", { lookup: publicLookup }), /Local, private/);
  await assert.rejects(() => validateLiveSiteUrl("http://127.0.0.1", { lookup: publicLookup }), /Private and loopback/);
  await assert.rejects(() => validateLiveSiteUrl("https://user:secret@example.com", { lookup: publicLookup }), /embedded credentials/);
  await assert.rejects(() => validateLiveSiteUrl("https://example.com:8443", { lookup: publicLookup }), /standard web ports/);
  await assert.rejects(() => validateLiveSiteUrl("https://rebound.example", { lookup: async () => [{ address: "10.0.0.8", family: 4 }] }), /resolves to a private/);
  assert.equal((await validateLiveSiteUrl("https://example.com/store", { lookup: publicLookup })).pathname, "/store");
});

test("live fetch follows only bounded public redirects and enforces HTML content", async () => {
  let calls = 0;
  const page = await fetchLivePage("https://example.com", {
    lookup: publicLookup,
    fetcher: async (url) => {
      calls += 1;
      if (calls === 1) return new Response(null, { status: 302, headers: { location: "/store" } });
      assert.equal(url, "https://example.com/store");
      return new Response("<html><title>Store</title><button>Buy</button></html>", { status: 200, headers: { "content-type": "text/html; charset=utf-8" } });
    },
  });
  assert.equal(page.finalUrl, "https://example.com/store");
  assert.equal(page.status, 200);
  assert.equal(page.bytes > 0, true);
  await assert.rejects(() => fetchLivePage("https://example.com", { lookup: publicLookup, fetcher: async () => new Response("binary", { status: 200, headers: { "content-type": "application/pdf" } }) }), /did not return an HTML/);
});

test("HTML extraction produces stable evidence for detector-backed live scans", () => {
  const snapshot = extractLiveSnapshot(`<!doctype html><html><head><title>ShopNest</title></head><body><main><button style="color:#555;background:#fff">Buy</button><button>Buy</button><input type="text"><p>draft copy</p></main></body></html>`, "https://example.com/store");
  assert.equal(snapshot.source, "server_html");
  assert.equal(snapshot.title, "ShopNest");
  assert.equal(snapshot.elements.length, 4);
  assert.ok(snapshot.elements.every((element) => element.id.startsWith("live-") || element.id === "buy"));
  assert.equal(snapshot.elements.find((element) => element.tag === "input")?.accessibleName, undefined);
});

test("live preview sanitization removes execution and navigation capabilities", () => {
  const preview = sanitizeLivePreviewHtml(`<!doctype html><html><head><script>window.bad = true</script><link rel="stylesheet" href="https://evil.example/app.css"></head><body><form action="https://evil.example/submit" onsubmit="window.bad = true"><a href="javascript:alert(1)" onclick="window.bad = true">Buy</a><img src="https://evil.example/image.png"><style>@import url(https://evil.example/theme.css); .card { background: url(https://evil.example/bg.png); }</style></form></body></html>`, "https://example.com/store");
  assert.doesNotMatch(preview, /<script|<link|javascript:|onsubmit|onclick|https:\/\/evil\.example/);
  assert.match(preview, /data-patchwork-preview-form/);
  assert.match(preview, /href="#"/);
});

test("live scan job stores progress, scan evidence, and findings without executing page scripts", async () => {
  const directory = await mkdtemp(join(tmpdir(), "patchwork-live-site-"));
  const context = await createApiContext({ filePath: join(directory, "state.json"), rateLimitPerMinute: 200 });
  try {
    const job = await startLiveScan(context, { siteId: "site_shopnest", pageUrl: "https://example.com/store" }, {
      lookup: publicLookup,
      fetcher: async () => new Response("<html><body><main><button>Buy</button><button>Buy</button><input type='text'><p>draft copy</p></main><script>globalThis.__shouldNotRun = true</script></body></html>", { status: 200, headers: { "content-type": "text/html" } }),
    });
    for (let attempt = 0; attempt < 40; attempt += 1) {
      if (getLiveScanJob(context, job.id).status === "completed") break;
      await new Promise((resolve) => setTimeout(resolve, 5));
    }
    const completed = getLiveScanJob(context, job.id);
    assert.equal(completed.status, "completed", completed.error ?? "");
    assert.equal(completed.result?.scan.status, "completed");
    assert.ok((completed.result?.findings.length ?? 0) >= 3);
    assert.match(completed.result?.snapshot.previewHtml ?? "", /<!doctype html>/i);
    assert.doesNotMatch(completed.result?.snapshot.previewHtml ?? "", /<script/i);
    assert.deepEqual(completed.events.map((event) => event.phase), ["queued", "validating", "fetching", "parsing", "analyzing", "completed"]);
    assert.equal(completed.result?.snapshot.elements.some((element) => element.text.includes("globalThis")), false);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("versioned live scan route returns a job and replayable SSE progress", async () => {
  const directory = await mkdtemp(join(tmpdir(), "patchwork-live-route-"));
  const context = await createApiContext({ filePath: join(directory, "state.json"), rateLimitPerMinute: 200 });
  const app = createApiApp(context, { rateLimitPerMinute: 200 });
  const server = await new Promise<import("node:http").Server>((resolve) => { const candidate = app.listen(0, "127.0.0.1", () => resolve(candidate)); });
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Live route test server did not bind.");
  const baseUrl = `http://127.0.0.1:${address.port}`;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (input, init) => {
    if (String(input) === "https://example.com/store") return new Response("<html><body><main><h1>Store</h1><button>Buy</button></main></body></html>", { status: 200, headers: { "content-type": "text/html" } });
    return originalFetch(input, init);
  }) as typeof fetch;
  try {
    const response = await originalFetch(`${baseUrl}/api/v1/live-sites/scan`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ siteId: "site_shopnest", pageUrl: "https://example.com/store" }) });
    assert.equal(response.status, 202);
    const payload = await response.json() as { data: { id: string; status: string } };
    assert.ok(["queued", "running", "completed"].includes(payload.data.status));
    for (let attempt = 0; attempt < 40; attempt += 1) {
      const current = await originalFetch(`${baseUrl}/api/v1/live-sites/scans/${payload.data.id}`);
      const currentPayload = await current.json() as { data: { status: string } };
      if (currentPayload.data.status === "completed") break;
      await new Promise((resolve) => setTimeout(resolve, 5));
    }
    const events = await originalFetch(`${baseUrl}/api/v1/live-sites/scans/${payload.data.id}/events`);
    const eventText = await events.text();
    assert.equal(events.headers.get("content-type"), "text/event-stream; charset=utf-8");
    assert.match(eventText, /event: queued/);
    assert.match(eventText, /event: completed/);
  } finally {
    globalThis.fetch = originalFetch;
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await new Promise((resolve) => setTimeout(resolve, 50));
    await rm(directory, { recursive: true, force: true });
  }
});
