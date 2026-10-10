import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function source(path) {
  return readFile(new URL(path, root), "utf8");
}

test("motion honors reduced-motion preferences and uses the documented timing scale", async () => {
  const motion = await source("apps/dashboard/src/ui/motion.tsx");
  const css = await source("apps/dashboard/src/ui/ui.css");

  assert.match(motion, /reducedMotion="user"/);
  assert.match(motion, /fast:\s*0\.12/);
  assert.match(motion, /emphasis:\s*0\.32/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
});

test("interactive primitives carry keyboard and announcement contracts", async () => {
  const button = await source("apps/dashboard/src/ui/button.tsx");
  const command = await source("apps/dashboard/src/ui/command.tsx");
  const overlays = await source("apps/dashboard/src/ui/overlays.tsx");
  const fields = await source("apps/dashboard/src/ui/fields.tsx");

  assert.match(button, /type="button"/);
  assert.match(button, /aria-busy/);
  assert.match(command, /label="Command palette"/);
  assert.match(command, /⌘\s*K/);
  assert.match(overlays, /aria-live="polite"/);
  assert.match(fields, /htmlFor=\{id\}/);
});

test("the design gallery keeps the signature moments reachable", async () => {
  const page = await source("app/design/page.tsx");
  const requiredMoments = [
    "BeforeAfterSlider",
    "ArchitectureBeams",
    "RollbackTimeMachine",
    "ShipConfetti",
    "AiOrb",
    "DomTreeVisualizer",
    "AuditChain",
    "IntegrationMarquee",
  ];

  for (const moment of requiredMoments) assert.match(page, new RegExp(moment));
});

test("responsive screenshot coverage is explicit and console errors fail the run", async () => {
  const runner = await source("tools/screenshots.mjs");

  for (const route of ["storefront", "design-system"]) assert.match(runner, new RegExp(route));
  assert.match(runner, /const themes = \["dark", "light"\]/);
  for (const viewport of ["desktop", "tablet", "mobile"]) assert.match(runner, new RegExp(viewport));
  assert.match(runner, /console errors/);
  assert.match(runner, /pageerror/);
});
