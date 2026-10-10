import assert from "node:assert/strict";
import test from "node:test";
import { detectConflicts, detectDependencyConflicts, operationPropertyKey } from "../packages/core/src/index";
import { patchSchema, type Patch } from "../packages/core/src/index";

const author = { id: "usr_maya", name: "Maya Singh", email: "maya@acme.example" };
const target = { fingerprint: "fp_checkout_button_001", fallbackLabel: "Add to cart", expectedTag: "button", expectedRole: "button" };
const otherTarget = { fingerprint: "fp_price_label_002", fallbackLabel: "Price", expectedTag: "span", expectedRole: "text" };
const baseHash = `sha256-${"a".repeat(64)}`;

function makePatch(id: string, operation: Record<string, unknown>, dependencies: readonly string[] = [], manifestHash = baseHash): Patch {
  return patchSchema.parse({
    identity: { id, siteId: "site_shopnest", targetFingerprint: target.fingerprint, createdBy: author.id },
    revision: { revision: 1, baseManifestHash: manifestHash, contentHash: `sha256-${"c".repeat(64)}`, createdAt: "2026-10-10T08:00:00.000Z", author, message: `Revision for ${id}` },
    title: `Patch ${id}`,
    description: "A reviewable change for the seeded incident.",
    status: "draft",
    operations: [operation],
    dependencies,
    reviewers: [author],
    tags: ["incident"],
    createdAt: "2026-10-10T08:00:00.000Z",
    updatedAt: "2026-10-10T08:00:00.000Z",
  });
}

test("operation property keys make same-target changes comparable", () => {
  const style = { id: "style", kind: "style", target, property: "color", value: "#fff" } as const;
  const text = { id: "text", kind: "text", target, value: "Add to cart" } as const;
  assert.equal(operationPropertyKey(style), `${target.fingerprint}::style:color`);
  assert.equal(operationPropertyKey(text), `${target.fingerprint}::text`);
});

test("conflict matrix distinguishes direct, semantic, stale, and mergeable changes", () => {
  const leftStyle = makePatch("patch-left", { id: "style-left", kind: "style", target, property: "color", value: "#ffffff" });
  const rightStyle = makePatch("patch-right", { id: "style-right", kind: "style", target, property: "color", value: "#111111" });
  assert.equal(detectConflicts(leftStyle, rightStyle).some((conflict) => conflict.kind === "property"), true);

  const hide = makePatch("patch-hide", { id: "hide", kind: "hide", target, hidden: true });
  const style = makePatch("patch-style", { id: "style", kind: "style", target, property: "display", value: "block" });
  assert.equal(detectConflicts(hide, style).some((conflict) => conflict.kind === "hide_style"), true);

  const reorderLeft = makePatch("patch-reorder-left", { id: "reorder-left", kind: "reorder", target, direction: "before", siblingFingerprint: "fp_title_00000001" });
  const reorderRight = makePatch("patch-reorder-right", { id: "reorder-right", kind: "reorder", target, direction: "after", siblingFingerprint: "fp_footer_00000002" });
  assert.equal(detectConflicts(reorderLeft, reorderRight).some((conflict) => conflict.kind === "reorder"), true);

  const stale = makePatch("patch-stale", { id: "stale", kind: "text", target, value: "Restore checkout" }, [], `sha256-${"b".repeat(64)}`);
  assert.equal(detectConflicts(leftStyle, stale).some((conflict) => conflict.kind === "stale_manifest"), true);

  const mergeable = makePatch("patch-mergeable", { id: "other", kind: "text", target: otherTarget, value: "$248" });
  assert.equal(detectConflicts(leftStyle, mergeable).length, 0);
});

test("dependency graph reports missing nodes and cycles", () => {
  const missing = makePatch("patch-missing", { id: "missing-op", kind: "text", target, value: "Restore" }, ["patch-not-present"]);
  assert.equal(detectDependencyConflicts([missing]).some((conflict) => conflict.explanation.includes("not in the release")), true);

  const left = makePatch("patch-cycle-a", { id: "cycle-a", kind: "text", target, value: "A" }, ["patch-cycle-b"]);
  const right = makePatch("patch-cycle-b", { id: "cycle-b", kind: "text", target: otherTarget, value: "B" }, ["patch-cycle-a"]);
  assert.equal(detectDependencyConflicts([left, right]).some((conflict) => conflict.explanation.includes("cycle")), true);
});
