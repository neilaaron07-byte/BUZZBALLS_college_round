import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
async function source(path) { return readFile(new URL(path, root), "utf8"); }

test("marketing surface explains the PATCHWORK promise and routes to the operator workspace", async () => {
  const page = await source("apps/web/src/marketing-page.tsx");
  assert.match(page, /Fix any website/);
  assert.match(page, /SCAN\. FIX\. SHIP\./);
  assert.match(page, /href="\/dashboard"/);
  assert.match(page, /isolate|inverse|rollback/i);
  assert.doesNotMatch(page, /https?:\/\//);
});

test("marketing proof and interaction contracts stay measurable", async () => {
  const page = await source("apps/web/src/marketing-page.tsx");
  const css = await source("apps/web/src/marketing.css");
  for (const value of ["200", "7.2 KB", "52", "1 click", "repair-slider"]) assert.match(page, new RegExp(value.replace(/[.]/g, "\\.")));
  assert.match(page, /setDemoStep/);
  assert.match(page, /type="range"/);
  assert.match(css, /prefers-reduced-motion/);
  assert.match(css, /@media \(max-width: 680px\)/);
});
