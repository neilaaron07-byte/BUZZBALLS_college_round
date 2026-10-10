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
        const response = await page.goto(`${baseUrl}${route.path}`, { waitUntil: "networkidle", timeout: 30000 });
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
