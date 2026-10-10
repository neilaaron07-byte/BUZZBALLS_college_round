import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_RESOLVER_THRESHOLDS,
  fingerprintFromSnapshot,
  generateResolverBenchmark,
  resolveTarget,
  type ElementSnapshot,
} from "../packages/core/src/index";

const baseSnapshot: ElementSnapshot = {
  tag: "button",
  attributes: {
    id: "purchase-button",
    "data-testid": "add-to-cart",
    role: "button",
    "aria-label": "Add to cart",
    class: "button button-primary css-a1b2c3d4",
  },
  text: "Add to cart",
  path: ["body", "main", "section:product", "div:purchase", "button"],
  siblings: ["h2", "p", "button"],
  landmarks: ["main", "product-card", "purchase-panel"],
  rect: { top: 420, left: 620, width: 180, height: 48, viewportWidth: 1440, viewportHeight: 900 },
  visualRole: "button",
};

type SnapshotOverrides = Partial<Omit<ElementSnapshot, "attributes" | "rect">> & {
  attributes?: Readonly<Record<string, string | undefined>>;
  rect?: Partial<ElementSnapshot["rect"]>;
};

function candidate(id: string, label: string, overrides: SnapshotOverrides = {}) {
  const attributes: Record<string, string> = {};
  for (const [key, value] of Object.entries({ ...baseSnapshot.attributes, ...(overrides.attributes ?? {}) })) {
    if (value !== undefined) attributes[key] = value;
  }
  const snapshot: ElementSnapshot = {
    ...baseSnapshot,
    ...overrides,
    attributes,
    rect: { ...baseSnapshot.rect, ...(overrides.rect ?? {}) },
  };
  return { id, label, fingerprint: fingerprintFromSnapshot(snapshot) };
}

const target = fingerprintFromSnapshot(baseSnapshot);

const mutationScenarios: ReadonlyArray<{
  name: string;
  expected: "exact" | "moved" | "ambiguous" | "missing";
  candidates: ReturnType<typeof candidate>[];
  expectedTargetId: string | null;
}> = [
  { name: "exact original", expected: "exact", candidates: [candidate("original", "Add to cart")], expectedTargetId: "original" },
  { name: "whitespace normalization", expected: "exact", candidates: [candidate("whitespace", "Add to cart", { text: "  Add   to   cart  " })], expectedTargetId: "whitespace" },
  { name: "case normalization", expected: "exact", candidates: [candidate("case", "Add to cart", { text: "ADD TO CART" })], expectedTargetId: "case" },
  { name: "numeric normalization", expected: "moved", candidates: [candidate("numeric", "Add to cart", { text: "Add to cart 24" })], expectedTargetId: "numeric" },
  { name: "hashed class token changes", expected: "exact", candidates: [candidate("hashed-class", "Add to cart", { attributes: { class: "button button-primary css-f0e1d2c3" } })], expectedTargetId: "hashed-class" },
  { name: "meaningful utility class is appended", expected: "exact", candidates: [candidate("utility-class", "Add to cart", { attributes: { class: "button button-primary cta" } })], expectedTargetId: "utility-class" },
  { name: "one wrapper inserted", expected: "exact", candidates: [candidate("one-wrapper", "Add to cart", { path: ["body", "main", "section:product", "div:purchase", "div", "button"] })], expectedTargetId: "one-wrapper" },
  { name: "two wrappers inserted", expected: "moved", candidates: [candidate("two-wrappers", "Add to cart", { path: ["body", "main", "section:product", "div:purchase", "div", "div", "button"] })], expectedTargetId: "two-wrappers" },
  { name: "sibling inserted", expected: "exact", candidates: [candidate("sibling-inserted", "Add to cart", { siblings: ["h2", "p", "span", "button"] })], expectedTargetId: "sibling-inserted" },
  { name: "sibling removed", expected: "exact", candidates: [candidate("sibling-removed", "Add to cart", { siblings: ["h2", "button"] })], expectedTargetId: "sibling-removed" },
  { name: "siblings reordered", expected: "exact", candidates: [candidate("siblings-reordered", "Add to cart", { siblings: ["button", "p", "h2"] })], expectedTargetId: "siblings-reordered" },
  { name: "landmark wrapper added", expected: "exact", candidates: [candidate("landmark-added", "Add to cart", { landmarks: ["main", "product-card", "purchase-panel", "sticky-footer"] })], expectedTargetId: "landmark-added" },
  { name: "landmark renamed", expected: "exact", candidates: [candidate("landmark-renamed", "Add to cart", { landmarks: ["main", "product-card", "checkout-panel"] })], expectedTargetId: "landmark-renamed" },
  { name: "horizontal movement within region", expected: "exact", candidates: [candidate("horizontal-move", "Add to cart", { rect: { left: 680 } })], expectedTargetId: "horizontal-move" },
  { name: "vertical movement within region", expected: "exact", candidates: [candidate("vertical-move", "Add to cart", { rect: { top: 500 } })], expectedTargetId: "vertical-move" },
  { name: "cross-region movement", expected: "moved", candidates: [candidate("cross-region", "Add to cart", { rect: { top: 760 } })], expectedTargetId: "cross-region" },
  { name: "edited aria label", expected: "exact", candidates: [candidate("edited-label", "Add to cart", { attributes: { "aria-label": "Buy this item" } })], expectedTargetId: "edited-label" },
  { name: "edited copy", expected: "moved", candidates: [candidate("edited-copy", "Buy now", { text: "Buy now" })], expectedTargetId: "edited-copy" },
  { name: "edited copy and renamed class", expected: "moved", candidates: [candidate("edited-copy-class", "Purchase", { text: "Purchase", attributes: { class: "button purchase" } })], expectedTargetId: "edited-copy-class" },
  { name: "tag changed to link", expected: "missing", candidates: [candidate("wrong-tag", "Add to cart", { tag: "a", attributes: { role: "link", href: "/cart" }, visualRole: "link" })], expectedTargetId: null },
  { name: "removed from page", expected: "missing", candidates: [], expectedTargetId: null },
  { name: "weak unrelated candidate", expected: "missing", candidates: [candidate("unrelated", "Footer text", { tag: "div", text: "Footer text", path: ["body", "footer", "p"], siblings: ["small"], landmarks: ["contentinfo"], visualRole: "text", attributes: { id: "footer-copy", role: undefined, "aria-label": undefined, class: "muted" } })], expectedTargetId: null },
  { name: "duplicate exact targets", expected: "ambiguous", candidates: [candidate("duplicate-a", "Add to cart"), candidate("duplicate-b", "Add to cart")], expectedTargetId: null },
  { name: "duplicate after wrapper move", expected: "ambiguous", candidates: [candidate("duplicate-moved-a", "Add to cart", { path: ["body", "main", "section:product", "div", "button"] }), candidate("duplicate-moved-b", "Add to cart", { path: ["body", "main", "section:product", "div", "button"] })], expectedTargetId: null },
  { name: "near duplicate with utility class", expected: "ambiguous", candidates: [candidate("near-a", "Add to cart"), candidate("near-b", "Add to cart", { attributes: { class: "button button-primary alt" } })], expectedTargetId: null },
  { name: "wrong element before correct element", expected: "exact", candidates: [candidate("wrong-first", "Cancel", { attributes: { id: "cancel", "data-testid": "cancel", "aria-label": "Cancel", class: "button secondary" }, text: "Cancel" }), candidate("correct-second", "Add to cart")], expectedTargetId: "correct-second" },
  { name: "card candidate beside button", expected: "exact", candidates: [candidate("card", "Product card", { tag: "article", text: "Aurora headphones", path: ["body", "main", "article"], visualRole: "card", attributes: { role: undefined, "aria-label": "Aurora headphones", class: "product-card" } }), candidate("button", "Add to cart")], expectedTargetId: "button" },
  { name: "same copy different visual role", expected: "exact", candidates: [candidate("link-copy", "Add to cart", { tag: "a", attributes: { role: "link", href: "/cart" }, visualRole: "link" }), candidate("button-copy", "Add to cart")], expectedTargetId: "button-copy" },
  { name: "reordered section with stable semantics", expected: "moved", candidates: [candidate("reordered-section", "Add to cart", { path: ["body", "main", "section:summary", "div:purchase", "button"], landmarks: ["main", "summary-card", "purchase-panel"] })], expectedTargetId: "reordered-section" },
  { name: "class renamed but stable id remains", expected: "exact", candidates: [candidate("stable-id", "Add to cart", { attributes: { class: "new-button-name" } })], expectedTargetId: "stable-id" },
  { name: "viewport resized with same region", expected: "exact", candidates: [candidate("resized", "Add to cart", { rect: { viewportWidth: 1024, viewportHeight: 768, left: 420, top: 320 } })], expectedTargetId: "resized" },
  { name: "candidate removed after reorder", expected: "missing", candidates: [candidate("other-button", "Continue", { tag: "a", text: "Continue", path: ["body", "footer", "a"], siblings: ["small"], landmarks: ["contentinfo"], visualRole: "link", attributes: { id: "continue", "data-testid": "continue", role: "link", "aria-label": "Continue", class: "footer-link", href: "/continue" } })], expectedTargetId: null },
];

test("resolver handles 32 realistic mutations without applying to the wrong element", () => {
  assert.equal(mutationScenarios.length, 32);
  for (const scenario of mutationScenarios) {
    const result = resolveTarget(target, scenario.candidates);
    assert.equal(result.outcome, scenario.expected, scenario.name);
    assert.equal(result.targetId, scenario.expectedTargetId, `${scenario.name}: wrong target selected`);
    assert.ok(result.reason.length > 30, `${scenario.name}: explanation is too short`);
    if (result.winner) assert.equal(result.winner.signals.length, 8, `${scenario.name}: signal evidence missing`);
  }
});

test("thresholds and margins are configurable without changing signal evidence", () => {
  const candidateTarget = candidate("threshold-target", "Add to cart", { path: ["body", "main", "div", "div", "button"] });
  const strict = resolveTarget(target, [candidateTarget], { ...DEFAULT_RESOLVER_THRESHOLDS, minimumConfidence: 0.99 });
  assert.equal(strict.outcome, "missing");
  const permissive = resolveTarget(target, [candidateTarget], { ...DEFAULT_RESOLVER_THRESHOLDS, minimumConfidence: 0.60, exactConfidence: 0.99 });
  assert.equal(permissive.outcome, "moved");
  assert.equal(permissive.winner?.signals.length, 8);
});

test("the deterministic benchmark generator emits 200 explainable scenarios", () => {
  const scenarios = generateResolverBenchmark();
  assert.equal(scenarios.length, 200);
  assert.equal(scenarios[0]?.id, "resolver-benchmark-001");
  assert.equal(scenarios[199]?.id, "resolver-benchmark-200");
  for (const scenario of scenarios) {
    const result = resolveTarget(scenario.target, scenario.candidates);
    assert.equal(result.outcome === "exact" || result.outcome === "moved", true, scenario.id);
    assert.equal(result.targetId, scenario.expectedTargetId, `${scenario.id}: wrong candidate applied`);
  }
});
