import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
async function source(path) { return readFile(new URL(path, root), "utf8"); }

test("marketing surface explains the PATCHWORK promise and routes to the operator workspace", async () => {
  const page = await source("apps/web/src/marketing-page.tsx");
  const hero = await source("apps/web/src/marketing-hero.tsx");
  const chrome = await source("apps/web/src/marketing-chrome.tsx");
  const sections = await source("apps/web/src/marketing-sections.tsx");
  const combined = `${page}\n${hero}\n${chrome}\n${sections}`;
  assert.match(combined, /Fix any website/);
  assert.match(combined, /SCAN\. FIX\. SHIP\./);
  assert.match(combined, /href="\/dashboard"/);
  assert.match(combined, /isolate|inverse|rollback/i);
  assert.doesNotMatch(combined, /https?:\/\//);
});

test("marketing proof and interaction contracts stay measurable", async () => {
  const page = await source("apps/web/src/marketing-page.tsx");
  const data = await source("apps/web/src/marketing-data.ts");
  const engine = await source("apps/web/src/marketing-engine.ts");
  const hero = await source("apps/web/src/marketing-hero.tsx");
  const css = await source("apps/web/src/marketing.css");
  const evidence = await source("apps/dashboard/src/evidence-engine.ts");
  for (const value of ["200", "108", "1 click"]) assert.match(data, new RegExp(value.replace(/[.]/g, "\\.")));
  assert.match(data, /evidenceBudgets/);
  assert.match(evidence, /7\.2 KB gzip/);
  assert.match(page, /setDemoStep/);
  assert.match(page + hero, /type="range"/);
  assert.match(engine, /safePlaygroundResult|answerForQuestion/);
  assert.match(css, /prefers-reduced-motion/);
  assert.match(css, /@media \(max-width: 680px\)/);
});

test("public marketing routes share a complete, offline-safe subpage shell", async () => {
  const page = await source("apps/web/src/marketing-subpage.tsx");
  const screenshots = await source("tools/screenshots.mjs");
  for (const kind of ["tour", "security", "customers", "docs"]) {
    const route = await source(`app/web/${kind}/page.tsx`);
    assert.ok(route.includes('kind="' + kind + '"' ));
  }
  for (const path of ["/web/tour", "/web/security", "/web/customers", "/web/docs"]) assert.match(screenshots, new RegExp(path));
  assert.match(page, /Test offline state/);
  assert.match(page, /role="alert"/);
  assert.match(page, /role="status"/);
  assert.doesNotMatch(page, /https?:\/\//);
});

test("marketing metadata and social preview stay local and measurable", async () => {
  const layout = await source("app/layout.tsx");
  const budget = await source("docs/evidence/lighthouse-budget.md");
  assert.match(layout, /Fix any website in 60 seconds/);
  assert.match(layout, /openGraph/);
  assert.match(layout, /\/og\.png/);
  assert.match(layout, /summary_large_image/);
  assert.match(budget, /`\/web`/);
  assert.match(budget, /Performance \| Accessibility \| Best practices/);
  assert.match(budget, /90\+/);
  assert.match(budget, /95\+/);
});
