import assert from "node:assert/strict";
import test from "node:test";
import {
  assertManifestAcceptable,
  auditEntrySchema,
  createAuditEntry,
  detectBrokenLinks,
  detectContrast,
  detectDuplicateActions,
  detectMissingLabels,
  detectOverflow,
  detectStaleCopy,
  manifestSchema,
  scanPage,
  signManifest,
  verifyChain,
  verifyManifestSignature,
  type Manifest,
  type ScanSnapshot,
} from "../packages/core/src/index";

const author = { id: "usr_maya", name: "Maya Singh", email: "maya@acme.example" };
const timestamp = "2026-10-10T08:00:00.000Z";
const manifest: Manifest = manifestSchema.parse({
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

test("Ed25519 manifest signatures verify and reject tampering", async () => {
  const keyPair = await globalThis.crypto.subtle.generateKey({ name: "Ed25519" }, true, ["sign", "verify"]) as CryptoKeyPair;
  const signature = await signManifest(manifest, keyPair.privateKey);
  assert.equal(await verifyManifestSignature(manifest, signature, keyPair.publicKey), true);
  assert.equal(await verifyManifestSignature({ ...manifest, releaseId: "rel_tampered" }, signature, keyPair.publicKey), false);
  assert.doesNotThrow(() => assertManifestAcceptable(manifest, { siteId: "site_shopnest", environment: "production", now: new Date(timestamp), acceptedReleaseIds: [] }));
  assert.throws(() => assertManifestAcceptable(manifest, { siteId: "site_shopnest", environment: "production", now: new Date(timestamp), acceptedReleaseIds: [manifest.releaseId] }), /already been accepted/);
  assert.throws(() => assertManifestAcceptable({ ...manifest, killSwitch: { enabled: true, reason: "Incident", enabledAt: timestamp, enabledBy: author.id } }, { siteId: "site_shopnest", environment: "production", now: new Date(timestamp), acceptedReleaseIds: [] }), /kill switch/);
});

test("audit chain detects tampering and broken links", async () => {
  const first = await createAuditEntry({ id: "audit-1", action: "patch_created", actor: author, subjectId: "patch-1", timestamp, details: { message: "Created from a scan finding." } }, null);
  const second = await createAuditEntry({ id: "audit-2", action: "patch_verified", actor: author, subjectId: "patch-1", timestamp, details: { message: "Verification passed." } }, first);
  assert.deepEqual(await verifyChain([first, second]), { valid: true, failedAt: null, reason: "The audit chain is intact." });
  const tampered = auditEntrySchema.parse({ ...second, details: { message: "Evidence changed after review." } });
  assert.equal((await verifyChain([first, tampered])).valid, false);
  const missingLink = auditEntrySchema.parse({ ...second, previousHash: null });
  assert.equal((await verifyChain([first, missingLink])).reason, "Audit entry does not point to the previous hash.");
});

const snapshot: ScanSnapshot = {
  pageUrl: "https://shopnest.example/products/aurora",
  viewport: { width: 390, height: 844 },
  elements: [
    { id: "price", tag: "p", text: "$248", visible: true, region: "middle-center", rect: { left: 20, top: 100, right: 120, bottom: 130 }, styles: { foreground: "#777777", background: "#ffffff", fontSizePx: 16, fontWeight: 400 } },
    { id: "buy-a", tag: "button", text: "Buy now", accessibleName: "Buy now", visible: true, region: "bottom-center", rect: { left: 20, top: 700, right: 180, bottom: 748 }, styles: { foreground: "#ffffff", background: "#111111" } },
    { id: "buy-b", tag: "button", text: "Buy now", accessibleName: "Buy now", visible: true, region: "bottom-center", rect: { left: 200, top: 700, right: 360, bottom: 748 }, styles: { foreground: "#ffffff", background: "#111111" } },
    { id: "copy", tag: "p", text: "Draft copy", visible: true, region: "top-center", rect: { left: 20, top: 20, right: 180, bottom: 50 } },
    { id: "icon-button", tag: "button", text: "", visible: true, region: "top-right", rect: { left: 360, top: 20, right: 410, bottom: 70 } },
    { id: "broken", tag: "a", text: "Shipping policy", accessibleName: "Shipping policy", href: "/shipping", linkStatus: 404, visible: true, region: "bottom-left", rect: { left: 20, top: 760, right: 180, bottom: 800 } },
    { id: "wide-card", tag: "article", text: "Aurora", visible: true, region: "middle-center", rect: { left: 0, top: 200, right: 500, bottom: 500 } },
  ],
};

test("scanner detectors report contrast, duplicates, stale copy, labels, links, and overflow", () => {
  assert.equal(detectContrast(snapshot).length, 1);
  assert.equal(detectDuplicateActions(snapshot).length, 1);
  assert.equal(detectStaleCopy(snapshot).length, 1);
  assert.equal(detectMissingLabels(snapshot).length, 1);
  assert.equal(detectBrokenLinks(snapshot).length, 1);
  assert.equal(detectOverflow(snapshot).length, 2);
  const findings = scanPage(snapshot);
  assert.equal(findings.length, 7);
  assert.equal(findings[0]?.severity, "high");
  assert.ok(findings.every((finding) => finding.explanation.length > 10));
});
