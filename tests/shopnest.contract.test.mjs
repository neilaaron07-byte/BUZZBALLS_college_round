import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
async function source(path) { return readFile(new URL(path, root), "utf8"); }

test("ShopNest exposes the complete product route matrix", async () => {
  const routes = await source("tools/screenshots.mjs");
  for (const path of ["/", "/search", "/product/aurora-headphones", "/cart", "/checkout", "/login"]) assert.match(routes, new RegExp(path));
  for (const path of ["app/search/page.tsx", "app/product/[slug]/page.tsx", "app/cart/page.tsx", "app/checkout/page.tsx", "app/login/page.tsx"]) assert.match(await source(path), /ShopNestProvider/);
});

test("ShopNest fixture modes make the seeded incident explicit", async () => {
  const catalog = await source("apps/shopnest/src/catalog.ts");
  for (const mode of ["v1", "v2", "v3"]) assert.match(catalog, new RegExp(`${mode}:`));
  assert.match(catalog, /hidden-buy-button/);
  assert.match(catalog, /low-contrast-price/);
  assert.match(catalog, /ambiguous-target/);
  assert.match(catalog, /rollback/i);
});

test("ShopNest screens include honest empty, error, success, and retry states", async () => {
  const screens = await Promise.all(["apps/shopnest/src/search-screen.tsx", "apps/shopnest/src/cart-screen.tsx", "apps/shopnest/src/checkout-screen.tsx", "apps/shopnest/src/login-screen.tsx"].map(source));
  const combined = screens.join("\n");
  assert.match(combined, /No exact matches/);
  assert.match(combined, /Your cart is clear/);
  assert.match(combined, /ORDER CONFIRMED/);
  assert.match(combined, /role="alert"/);
  assert.match(combined, /Reset local lock/);
});

test("ShopNest safety handoff stays visible on the product and home surfaces", async () => {
  const home = await source("apps/shopnest/src/home-screen.tsx");
  const product = await source("apps/shopnest/src/product-screen.tsx");
  const inspector = await source("apps/shopnest/src/components.tsx");
  for (const text of ["Open the finding", "Safe preview", "Undo in one click", "Run verification gate", "Pass-after confirmed"]) assert.match(`${home}\n${product}\n${inspector}`, new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.doesNotMatch(`${home}\n${product}\n${inspector}`, /alert\(|confirm\(|prompt\(/);
});
