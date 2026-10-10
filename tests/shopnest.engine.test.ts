import assert from "node:assert/strict";
import test from "node:test";
import { categories, getProduct, products } from "../apps/shopnest/src/catalog";
import { categoryFacetCounts, catalogSummary, collectionByCategory, emptyCatalogQuery, featuredCollection, formatCatalogSummary, highestRatedProduct, normalizeCatalogQuery, parseCatalogQuery, priceLabel, productsForSavedSlugs, queryCatalog, queryDescription, recommendProducts, serializeCatalogQuery, stockTone } from "../apps/shopnest/src/catalog-engine";
import { cartItemCount, cartSubtotal, checkoutNextStep, cleanCart, createDemoOrder, demoCardNumber, formatCardNumber, mergeCartLines, normalizeCardNumber, orderDestination, orderId, orderTotals, shippingForSubtotal, taxForSubtotal, validateAddress, validatePayment } from "../apps/shopnest/src/checkout-engine";
import { canApplyPatch, canPromote, findingSeverity, findingTitle, gateStatus, releaseGates, releaseHealth, releaseSummary, releaseTimeline, rollbackReason, scoreSignals, targetEvidence } from "../apps/shopnest/src/release-engine";

test("catalog query parsing is stable and preserves safe defaults", () => {
  assert.deepEqual(emptyCatalogQuery(), { text: "", category: "all", price: "all", sort: "featured" });
  assert.deepEqual(parseCatalogQuery("?q=audio&category=audio&price=over-200&sort=rating"), { text: "audio", category: "audio", price: "over-200", sort: "rating" });
  assert.deepEqual(normalizeCatalogQuery({ category: "unknown" as never, price: "invalid" as never, sort: "bad" as never }), emptyCatalogQuery());
  assert.equal(serializeCatalogQuery(parseCatalogQuery("?q=audio&category=audio&sort=rating")), "?q=audio&category=audio&sort=rating");
  assert.equal(queryDescription({ text: "audio", category: "audio", price: "all", sort: "featured" }), "matching “audio” · in audio");
});

test("catalog filtering, sorting, and summary remain deterministic", () => {
  const audio = queryCatalog({ category: "audio" });
  assert.ok(audio.length >= 2);
  assert.ok(audio.every((product) => product.category === "audio"));
  assert.deepEqual(queryCatalog({ price: "under-100", sort: "price-low" }).map((product) => product.slug), ["still-bottle", "cloud-travel-pillow", "morrow-mat"]);
  const rated = queryCatalog({ sort: "rating" });
  assert.equal(rated[0]?.slug, "aurora-headphones");
  const summary = catalogSummary(audio);
  assert.equal(summary.visible, audio.length);
  assert.equal(summary.categoryCounts.audio, audio.length);
  assert.match(formatCatalogSummary(summary), /objects? · average \$/);
  assert.deepEqual(categoryFacetCounts().reduce((total, facet) => total + facet.count, 0), products.length);
});

test("catalog recommendations and saved product helpers reflect real product relationships", () => {
  const seed = getProduct("aurora-headphones");
  const recommendations = recommendProducts(seed);
  assert.ok(recommendations.length > 0);
  assert.equal(recommendations[0]?.product.slug, "field-speaker");
  assert.match(recommendations[0]?.reason ?? "", /audio|Featured/);
  assert.deepEqual(productsForSavedSlugs(["aurora-headphones", "unknown"]).map((product) => product.slug), ["aurora-headphones"]);
  assert.equal(featuredCollection().length, 4);
  assert.equal(collectionByCategory("desk").length, 2);
  assert.equal(highestRatedProduct()?.slug, "aurora-headphones");
  assert.match(priceLabel(seed), /\$248/);
  assert.equal(stockTone(seed.stockLabel), "amber");
});

test("cart totals protect free-shipping and tax rules", () => {
  const first = getProduct("aurora-headphones");
  const second = getProduct("still-bottle");
  const lines = [{ product: first, quantity: 1, finish: "Graphite" }, { product: second, quantity: 2, finish: "Glacier" }];
  assert.equal(cartItemCount(lines), 3);
  assert.equal(cartSubtotal(lines), 24800 + 4200 * 2);
  assert.equal(shippingForSubtotal(0), 0);
  assert.equal(shippingForSubtotal(9000), 1200);
  assert.equal(shippingForSubtotal(10000), 0);
  assert.equal(taxForSubtotal(10000), 800);
  assert.deepEqual(orderTotals(lines), { subtotalCents: 33200, shippingCents: 0, taxCents: 2656, totalCents: 35856, itemCount: 3 });
});

test("cart merging and cleaning prevent invalid local state", () => {
  const product = getProduct("still-bottle");
  const lines = mergeCartLines([{ product, quantity: 2, finish: "Glacier" }, { product, quantity: 3, finish: "Glacier" }, { product, quantity: 1, finish: "Other" }, { product, quantity: 0, finish: "" }]);
  assert.equal(lines.length, 2);
  assert.equal(lines.find((line) => line.finish === "Glacier")?.quantity, 5);
  assert.equal(cleanCart([{ product, quantity: 12, finish: "Glacier" }])[0]?.quantity, 9);
});

test("address and payment validation explain the next safe action", () => {
  const empty = validateAddress({ name: "", email: "bad", line1: "", city: "", region: "", postalCode: "x" });
  assert.equal(empty.valid, false);
  assert.ok(empty.errors.some((error) => error.field === "email"));
  const address = { name: "Maya Chen", email: "maya@example.com", line1: "18 Mercer Street", city: "Brooklyn", region: "NY", postalCode: "11201" };
  assert.deepEqual(validateAddress(address), { valid: true, errors: [] });
  assert.equal(validatePayment("4242 4242 4242 4242").valid, true);
  assert.equal(validatePayment("4000 0000 0000 0002").valid, false);
  assert.equal(normalizeCardNumber("4242-4242 4242 4242"), demoCardNumber);
  assert.equal(formatCardNumber(demoCardNumber), "4242 4242 4242 4242");
});

test("checkout transitions include empty, retry, payment, review, and success branches", () => {
  const product = getProduct("still-bottle");
  const lines = [{ product, quantity: 1, finish: "Glacier" }];
  const address = { name: "Maya Chen", email: "maya@example.com", line1: "18 Mercer Street", city: "Brooklyn", region: "NY", postalCode: "11201" };
  assert.equal(checkoutNextStep("address", address, "", true).state, "payment");
  assert.equal(checkoutNextStep("payment", address, "bad", true).state, "failed");
  assert.equal(checkoutNextStep("payment", address, demoCardNumber, true).state, "review");
  assert.equal(checkoutNextStep("review", address, demoCardNumber, true).state, "success");
  assert.equal(checkoutNextStep("address", address, demoCardNumber, false).state, "retry");
  assert.equal(orderDestination(address), "Brooklyn, NY, 11201");
  const order = createDemoOrder("seed", address, lines);
  assert.match(order.id, /^SN–/);
  assert.equal(order.itemCount, 1);
  assert.equal(order.customer, "Maya Chen");
  assert.equal(orderId("seed", lines), order.id);
});

test("release health separates healthy, blocked, and ambiguous modes", () => {
  const healthy = releaseHealth("v1");
  const blocked = releaseHealth("v2");
  const ambiguous = releaseHealth("v3");
  assert.equal(healthy.posture, "healthy");
  assert.equal(blocked.posture, "blocked");
  assert.equal(ambiguous.target.outcome, "ambiguous");
  assert.equal(targetEvidence("v2").outcome, "moved");
  assert.equal(targetEvidence("v1").confidence, .99);
  assert.ok(blocked.score < healthy.score);
  assert.equal(scoreSignals([{ tone: "green", label: "a", detail: "b" }, { tone: "red", label: "c", detail: "d" }]), 35);
});

test("release gates and apply policy stay conservative", () => {
  assert.equal(gateStatus("v1", "verification"), "green");
  assert.equal(gateStatus("v2", "verification"), "red");
  assert.equal(gateStatus("v3", "verification"), "amber");
  assert.equal(releaseGates("v2").length, 4);
  assert.equal(canApplyPatch("v1", .99, true), true);
  assert.equal(canApplyPatch("v2", .98, true), true);
  assert.equal(canApplyPatch("v3", .98, true), false);
  assert.equal(canApplyPatch("v1", .5, true), false);
  assert.equal(canApplyPatch("v1", .99, false), false);
  assert.equal(canPromote("v1", true, true), true);
  assert.equal(canPromote("v2", true, true), false);
  assert.match(rollbackReason("v3"), /ambiguous/);
});

test("release timeline and finding copy make every mode reviewable", () => {
  for (const mode of ["v1", "v2", "v3"] as const) {
    const timeline = releaseTimeline(mode);
    assert.equal(timeline.length, 4);
    assert.equal(timeline[0]?.time, "09:42");
    assert.match(releaseSummary(mode).title, /evidence health/);
  }
  assert.match(findingTitle("hidden-buy-button"), /hidden/i);
  assert.equal(findingSeverity("hidden-buy-button"), "red");
  assert.equal(findingSeverity("moved-target"), "amber");
  assert.equal(findingSeverity("stale-return-copy"), "green");
});

test("category fixture remains coherent for all visible navigation facets", () => {
  for (const category of categories) {
    const items = collectionByCategory(category.id);
    assert.ok(items.length > 0);
    assert.ok(items.every((product) => product.category === category.id));
  }
  assert.ok(products.every((product) => product.slug && product.description && product.priceCents > 0));
});
