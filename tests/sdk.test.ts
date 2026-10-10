import assert from "node:assert/strict";
import test from "node:test";
import { JSDOM } from "jsdom";
import {
  fingerprintFromSnapshot,
  manifestSchema,
  patchSchema,
  signManifest,
  type Manifest,
} from "../packages/core/src/index";
import { PatchworkSDK, type SDKApplyResult, type SDKStorage } from "../packages/sdk/src/index";

const origin = "https://shopnest.example";
const author = { id: "usr_maya", name: "Maya Singh", email: "maya@acme.example" };
const timestamp = "2026-10-10T08:00:00.000Z";

class MemoryStorage implements SDKStorage {
  private readonly values = new Map<string, string>();
  getItem(key: string): string | null { return this.values.get(key) ?? null; }
  setItem(key: string, value: string): void { this.values.set(key, value); }
  removeItem(key: string): void { this.values.delete(key); }
}

function installDom(markup = "<main><button id='buy' data-testid='add-to-cart' aria-label='Add to cart'>Add to cart</button></main>"): JSDOM {
  const dom = new JSDOM(`<!doctype html><html><body>${markup}</body></html>`, { url: `${origin}/products/aurora` });
  globalThis.window = dom.window as unknown as Window & typeof globalThis;
  globalThis.document = dom.window.document;
  globalThis.MutationObserver = dom.window.MutationObserver;
  Object.defineProperty(globalThis, "innerWidth", { configurable: true, value: 1024 });
  Object.defineProperty(globalThis, "innerHeight", { configurable: true, value: 768 });
  return dom;
}

function evidenceForButton() {
  const button = document.querySelector("button");
  assert.ok(button);
  return fingerprintFromSnapshot({
    tag: "button",
    attributes: { id: "buy", "data-testid": "add-to-cart", "aria-label": "Add to cart" },
    text: "Add to cart",
    path: ["html", "body", "main", "button"],
    siblings: ["button"],
    landmarks: ["main"],
    rect: { top: 0, left: 0, width: 0, height: 0, viewportWidth: 1024, viewportHeight: 768 },
    visualRole: "button",
  });
}

async function signedManifest(): Promise<{ manifest: Manifest; privateKey: CryptoKey; publicKey: CryptoKey }> {
  const keyPair = await globalThis.crypto.subtle.generateKey({ name: "Ed25519" }, true, ["sign", "verify"]) as CryptoKeyPair;
  const manifest = manifestSchema.parse({
    version: 1,
    siteId: "site_shopnest",
    releaseId: "rel_20261010_01",
    environment: "production",
    baseHash: `sha256-${"a".repeat(64)}`,
    patchHashes: [],
    createdAt: timestamp,
    expiresAt: "2026-10-11T08:00:00.000Z",
    killSwitch: { enabled: false, reason: null, enabledAt: null, enabledBy: null },
  });
  return { manifest, privateKey: keyPair.privateKey, publicKey: keyPair.publicKey };
}

function patchFor(evidence: ReturnType<typeof evidenceForButton>, value: string, operationKind: "text" | "style" = "text") {
  const operation = operationKind === "text"
    ? { id: "op-text", kind: "text" as const, target: { fingerprint: "fp_checkout_button_001", fallbackLabel: "Add to cart", expectedTag: "button", expectedRole: "button", evidence }, value }
    : { id: "op-style", kind: "style" as const, target: { fingerprint: "fp_checkout_button_001", fallbackLabel: "Add to cart", expectedTag: "button", expectedRole: "button", evidence }, property: "backgroundColor" as const, value };
  return patchSchema.parse({
    identity: { id: "patch_checkout", siteId: "site_shopnest", targetFingerprint: "fp_checkout_button_001", createdBy: author.id },
    revision: { revision: 1, baseManifestHash: `sha256-${"a".repeat(64)}`, contentHash: `sha256-${"b".repeat(64)}`, createdAt: timestamp, author, message: "Restore checkout action" },
    title: "Restore checkout action",
    description: "Replace the stale promo overlay so checkout can proceed.",
    status: "verified",
    operations: [operation],
    dependencies: [],
    reviewers: [author],
    tags: ["checkout"],
    createdAt: timestamp,
    updatedAt: timestamp,
  });
}

function responseFor(manifest: Manifest, signature: string): typeof fetch {
  return async () => new Response(JSON.stringify({ manifest, signature }), { status: 200, headers: { "content-type": "application/json" } });
}

function expectFailure(result: SDKApplyResult): Exclude<SDKApplyResult, { ok: true }> {
  assert.equal(result.ok, false);
  if (result.ok) throw new Error("Expected SDK operation to fail.");
  return result;
}

test("SDK verifies a manifest, applies a patch transactionally, and rolls it back", async () => {
  installDom();
  const keys = await signedManifest();
  const signature = await signManifest(keys.manifest, keys.privateKey);
  const sdk = await PatchworkSDK.init({ siteId: "site_shopnest", siteOrigin: origin, environment: "production", manifestUrl: "/manifest.json", publicKey: keys.publicKey, fetchImpl: responseFor(keys.manifest, signature) });
  assert.equal(sdk.status, "ready");
  const result = await sdk.applyPatch(patchFor(evidenceForButton(), "Checkout now"));
  assert.equal(result.ok, true);
  assert.equal(document.querySelector("button")?.textContent, "Checkout now");
  assert.equal(sdk.rollbackLast(), true);
  assert.equal(document.querySelector("button")?.textContent, "Add to cart");
  sdk.stop();
});

test("SDK safely no-ops on ambiguous targets, unsafe operations, and signature failure", async () => {
  installDom("<main><button id='buy' data-testid='add-to-cart' aria-label='Add to cart'>Add to cart</button><button id='buy-copy' data-testid='add-to-cart' aria-label='Add to cart'>Add to cart</button></main>");
  const keys = await signedManifest();
  const signature = await signManifest(keys.manifest, keys.privateKey);
  const sdk = await PatchworkSDK.init({ siteId: "site_shopnest", siteOrigin: origin, environment: "production", manifestUrl: "/manifest.json", publicKey: keys.publicKey, fetchImpl: responseFor(keys.manifest, signature) });
  const ambiguous = await sdk.applyPatch(patchFor(evidenceForButton(), "Checkout now"));
  assert.equal(expectFailure(ambiguous).code, "TARGET_UNRESOLVED");
  const unsafePatch = patchFor(evidenceForButton(), "url(https://evil.example/steal)", "style");
  const unsafe = await sdk.applyPatch(unsafePatch);
  assert.equal(expectFailure(unsafe).code, "UNSAFE_PATCH");
  sdk.stop();

  const rejected = await PatchworkSDK.init({ siteId: "site_shopnest", siteOrigin: origin, environment: "production", manifestUrl: "/manifest.json", publicKey: keys.publicKey, fetchImpl: responseFor(keys.manifest, `${signature}tampered`) });
  assert.equal(rejected.status, "degraded");
  assert.equal(expectFailure(await rejected.applyPatch(unsafePatch)).code, "NOT_READY");
});

test("SDK uses the last verified manifest after an endpoint failure and reapplies after remount", async () => {
  const dom = installDom();
  const storage = new MemoryStorage();
  const keys = await signedManifest();
  const signature = await signManifest(keys.manifest, keys.privateKey);
  const first = await PatchworkSDK.init({ siteId: "site_shopnest", siteOrigin: origin, environment: "production", manifestUrl: "/manifest.json", publicKey: keys.publicKey, storage, fetchImpl: responseFor(keys.manifest, signature), debounceMs: 10 });
  const patch = patchFor(evidenceForButton(), "Checkout now");
  assert.equal((await first.applyPatch(patch)).ok, true);
  const replacement = document.createElement("button");
  replacement.id = "buy";
  replacement.setAttribute("data-testid", "add-to-cart");
  replacement.setAttribute("aria-label", "Add to cart");
  replacement.textContent = "Add to cart";
  document.querySelector("button")?.replaceWith(replacement);
  await new Promise((resolve) => setTimeout(resolve, 40));
  assert.equal(replacement.textContent, "Checkout now");
  first.stop();
  dom.window.close();

  const fallback = await PatchworkSDK.init({ siteId: "site_shopnest", siteOrigin: origin, environment: "production", manifestUrl: "/manifest.json", publicKey: keys.publicKey, storage, fetchImpl: async () => { throw new Error("offline"); } });
  assert.equal(fallback.status, "ready");
  assert.equal(fallback.activeManifest?.releaseId, keys.manifest.releaseId);
  fallback.stop();
});

test("SDK circuit breaker pauses repeated unresolved applications and health events batch", async () => {
  installDom();
  const keys = await signedManifest();
  const signature = await signManifest(keys.manifest, keys.privateKey);
  const events: string[] = [];
  const sdk = await PatchworkSDK.init({ siteId: "site_shopnest", siteOrigin: origin, environment: "production", manifestUrl: "/manifest.json", publicKey: keys.publicKey, fetchImpl: responseFor(keys.manifest, signature), failureThreshold: 2, telemetryTransport: async (batch) => { events.push(...batch.map((event) => event.status)); } });
  const missingEvidence = evidenceForButton();
  const missing = patchFor({
    ...missingEvidence,
    normalizedText: "missing target",
    textTokens: ["missing", "target"],
    textNgrams: ["missing target"],
    path: ["html", "body", "footer", "button"],
    landmarkChain: ["footer"],
    attributes: { ...missingEvidence.attributes, id: "missing", testId: "missing-target", ariaLabel: "Missing target", meaningfulClasses: ["not-here"] },
  }, "Checkout now");
  await sdk.applyPatch(missing);
  await sdk.applyPatch(missing);
  assert.equal(expectFailure(await sdk.applyPatch(missing)).code, "CIRCUIT_OPEN");
  assert.equal(sdk.telemetrySize > 0, true);
  assert.equal(await sdk.flushTelemetry(), true);
  assert.equal(events.includes("critical"), true);
  sdk.stop();
});
