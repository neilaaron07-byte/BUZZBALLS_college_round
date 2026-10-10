import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
async function source(path) { return readFile(new URL(path, root), "utf8"); }

test("dashboard navigation maps every operator surface to a typed route", async () => {
  const routes = await source("apps/dashboard/src/routes.ts");
  const page = await source("app/dashboard/page.tsx");
  for (const route of ["overview", "scan", "patches", "conflicts", "verification", "releases", "incidents", "reviews", "collaborators", "evidence", "install", "audit", "settings"]) {
    assert.match(routes, new RegExp(`id: "${route}"`));
    assert.match(page, new RegExp(route));
  }
});

test("dashboard support routes keep real decisions and accessible controls visible", async () => {
  const files = ["collaborators-screen.tsx", "evidence-screen.tsx", "install-screen.tsx", "settings-screen.tsx"];
  for (const file of files) {
    const content = await source(`apps/dashboard/src/${file}`);
    assert.match(content, /onNavigate/);
    assert.match(content, /Button/);
    assert.match(content, /aria-hidden|aria-label|aria-labelledby/);
  }
  const settings = await source("apps/dashboard/src/settings-screen.tsx");
  assert.match(settings, /aria-pressed/);
  assert.match(settings, /Reset local demo policy/);
});

test("dashboard loading and failure states are explicit and recoverable", async () => {
  const page = await source("app/dashboard/page.tsx");
  const feedback = await source("apps/dashboard/src/ui/feedback.tsx");
  const client = await source("apps/dashboard/src/api-client.ts");
  assert.match(page, /DashboardLoading/);
  assert.match(page, /ErrorState/);
  assert.match(page, /onRetry/);
  assert.match(feedback, /aria-live="polite"|role="alert"/);
  assert.match(client, /cloneFixture\(\)/);
});

test("PatchPilot is globally reachable and keeps release authority human-only", async () => {
  const shell = await source("apps/dashboard/src/dashboard-shell.tsx");
  const drawer = await source("apps/dashboard/src/patchpilot-drawer.tsx");
  assert.match(shell, /PatchPilotDrawer/);
  assert.match(drawer, /patchwork:open-patchpilot/);
  assert.match(drawer, /key\.toLowerCase\(\) === "j"/);
  assert.match(drawer, /actionCardFromProposal/);
  assert.match(drawer, /never publish, rollback, or delete/);
});

test("guided fix route exposes SCAN, FIX, SHIP, live API recovery, and undo", async () => {
  const route = await readFile(new URL("../app/fix/page.tsx", import.meta.url), "utf8");
  const page = await readFile(new URL("../apps/dashboard/src/fix-page.tsx", import.meta.url), "utf8");
  assert.match(route, /FixPage/);
  assert.match(page, /SCAN/);
  assert.match(page, /FIX/);
  assert.match(page, /SHIP/);
  assert.match(page, /api\/v1\/live-sites\/scan/);
  assert.match(page, /Stage 10% canary/);
  assert.match(page, /Undo canary/);
  assert.match(page, /Nothing changed/);
});
