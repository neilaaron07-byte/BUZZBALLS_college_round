import { copyFile, mkdir, readdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { chromium } from "playwright";

const baseUrl = process.env.PATCHWORK_BASE_URL ?? "http://localhost:3000";
const outputDirectory = join(process.cwd(), "docs");
const videoDirectory = join("/private/tmp", "patchwork-demo-video");
await mkdir(outputDirectory, { recursive: true });
await rm(videoDirectory, { recursive: true, force: true });
await mkdir(videoDirectory, { recursive: true });

await fetch(`${process.env.PATCHWORK_API_URL ?? "http://127.0.0.1:8787"}/demo/reset`, { method: "POST" });
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, recordVideo: { dir: videoDirectory, size: { width: 1280, height: 800 } } });
const page = await context.newPage();
const browserErrors = [];
page.on("console", (message) => { if (message.type() === "error") browserErrors.push(message.text()); });
page.on("pageerror", (error) => browserErrors.push(error.message));

async function scene(path, pauseMs = 3500) {
  await page.goto(`${baseUrl}${path}`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(pauseMs);
}

await scene("/fix", 8000);
await page.getByRole("button", { name: "Scan page" }).click();
await page.getByText("Scan complete.").waitFor({ state: "visible", timeout: 10_000 });
await page.waitForTimeout(8000);
await page.getByRole("button", { name: "Fix safe issues" }).click();
await page.waitForTimeout(4500);
await page.getByRole("button", { name: "Stage 10% canary" }).click();
await page.waitForTimeout(8000);

await scene("/dashboard?view=conflicts", 7000);
await page.getByRole("button", { name: "Keep verified patch" }).click();
await page.waitForTimeout(7000);
await page.getByRole("button", { name: "Ask PatchPilot" }).first().click();
await page.getByRole("textbox", { name: "Ask PatchPilot" }).fill("Explain the conflict and resolve it safely");
await page.getByRole("button", { name: "Send question" }).click();
await page.waitForTimeout(9000);

await scene("/dashboard?view=incidents", 5000);
await page.getByRole("button", { name: "Simulate critical threshold" }).click();
await page.waitForTimeout(5000);
await page.getByRole("button", { name: "Rollback now" }).click();
await page.waitForTimeout(7000);
await scene("/dashboard?view=audit", 25000);

await page.close();
await context.close();
await browser.close();
const files = await readdir(videoDirectory);
const source = files.find((file) => file.endsWith(".webm"));
if (!source) throw new Error("Playwright did not produce a WebM recording.");
await copyFile(join(videoDirectory, source), join(outputDirectory, "demo.webm"));
if (browserErrors.length > 0) throw new Error(`Demo browser errors: ${browserErrors.join(" | ")}`);
console.log(JSON.stringify({ video: join(outputDirectory, "demo.webm"), durationTargetSeconds: 90, browserErrors: 0 }, null, 2));
