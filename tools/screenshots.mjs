import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const root = fileURLToPath(new URL("../", import.meta.url));
const outputRoot = join(root, "docs", "screenshots");
const baseUrl = process.env.PATCHWORK_BASE_URL ?? "http://localhost:3000";
const routes = [
  { id: "storefront", path: "/" },
  { id: "design-system", path: "/design" },
  { id: "marketing", path: "/web" },
  { id: "marketing-tour", path: "/web/tour" },
  { id: "marketing-security", path: "/web/security" },
  { id: "marketing-customers", path: "/web/customers" },
  { id: "marketing-docs", path: "/web/docs" },
  { id: "dashboard-overview", path: "/dashboard?view=overview" },
  { id: "dashboard-scan", path: "/dashboard?view=scan" },
  { id: "dashboard-patches", path: "/dashboard?view=patches" },
  { id: "dashboard-conflicts", path: "/dashboard?view=conflicts" },
  { id: "dashboard-verification", path: "/dashboard?view=verification" },
  { id: "dashboard-releases", path: "/dashboard?view=releases" },
  { id: "dashboard-incidents", path: "/dashboard?view=incidents" },
  { id: "dashboard-reviews", path: "/dashboard?view=reviews" },
  { id: "dashboard-collaborators", path: "/dashboard?view=collaborators" },
  { id: "dashboard-evidence", path: "/dashboard?view=evidence" },
  { id: "dashboard-install", path: "/dashboard?view=install" },
  { id: "dashboard-audit", path: "/dashboard?view=audit" },
  { id: "dashboard-settings", path: "/dashboard?view=settings" },
];
const viewports = [
  { id: "desktop", width: 1440, height: 1000 },
  { id: "tablet", width: 1024, height: 900 },
  { id: "mobile", width: 390, height: 844 },
];
const themes = ["dark", "light"];

await mkdir(outputRoot, { recursive: true });
const browser = await chromium.launch({ headless: true });
const failures = [];
for (const route of routes) {
  for (const theme of themes) {
    for (const viewport of viewports) {
      const page = await browser.newPage({ viewport, deviceScaleFactor: 1 });
      const consoleErrors = [];
      page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });
      page.on("pageerror", (error) => consoleErrors.push(error.message));
      await page.addInitScript((selectedTheme) => window.localStorage.setItem("patchwork-theme", selectedTheme), theme);
      try {
        const response = await page.goto(`${baseUrl}${route.path}`, { waitUntil: route.path.startsWith("/dashboard") ? "domcontentloaded" : "networkidle", timeout: 30000 });
        if (!response || !response.ok()) throw new Error(`HTTP ${response?.status() ?? "no response"}`);
        await page.waitForTimeout(450);
        if (consoleErrors.length > 0) throw new Error(`console errors: ${consoleErrors.join(" | ")}`);
        const outputPath = join(outputRoot, `${route.id}-${theme}-${viewport.id}.png`);
        await page.screenshot({ path: outputPath, fullPage: true });
        console.log(`captured ${route.id} / ${theme} / ${viewport.id}`);
      } catch (error) {
        failures.push(`${route.id}/${theme}/${viewport.id}: ${error instanceof Error ? error.message : String(error)}`);
      } finally {
        await page.close();
      }
    }
  }
}
await browser.close();
if (failures.length > 0) {
  console.error(failures.join("\n"));
  process.exitCode = 1;
}
