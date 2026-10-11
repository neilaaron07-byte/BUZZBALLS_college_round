import { chromium } from "playwright";

const baseUrl = process.env.PATCHWORK_BASE_URL ?? "http://localhost:3000";
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
page.on("pageerror", (error) => errors.push(error.message));

async function open(path, text) {
  const response = await page.goto(`${baseUrl}${path}`, { waitUntil: "domcontentloaded" });
  if (!response?.ok()) throw new Error(`${path} returned ${response?.status() ?? "no response"}`);
  if (text) await page.getByText(text, { exact: false }).first().waitFor({ state: "visible", timeout: 10_000 });
}

await open("/web", "Fix any website in 60 seconds");
await open("/fix", "One-screen guided fix");
await page.getByRole("button", { name: "Scan page" }).click();
await page.getByText("Scan complete.", { exact: false }).waitFor({ state: "visible", timeout: 10_000 });
await page.getByRole("button", { name: "Fix safe issues" }).click();
await page.getByRole("heading", { name: "See the change before it ships." }).waitFor();
await page.getByRole("button", { name: "Confirm preview" }).click();
await page.getByRole("button", { name: "Stage 10% canary" }).click();

await open("/dashboard?view=conflicts", "Conflicts");
await page.getByRole("button", { name: "Keep verified patch" }).click();
await open("/dashboard?view=overview", "Good morning");
await page.getByRole("button", { name: "Ask PatchPilot" }).first().click();
await page.getByRole("textbox", { name: "Ask PatchPilot" }).fill("Explain the highest-risk finding");
await page.getByRole("button", { name: "Send question" }).click();
await page.getByText("PatchPilot", { exact: false }).first().waitFor({ state: "visible", timeout: 10_000 });

await open("/dashboard?view=incidents", "Incidents");
await page.getByRole("button", { name: "Simulate critical threshold" }).click();
await page.getByRole("button", { name: "Rollback now" }).click();
await page.getByText("Site healthy after rollback", { exact: false }).waitFor({ state: "visible", timeout: 10_000 });
await open("/dashboard?view=audit", "Audit trail");
await page.getByText("evidence chain is intact", { exact: false }).waitFor({ state: "visible", timeout: 10_000 });

await page.close();
await browser.close();
if (errors.length > 0) throw new Error(`Playwright console errors: ${errors.join(" | ")}`);
console.log(JSON.stringify({ flow: "scan-fix-ship-conflict-ai-rollback-audit", consoleErrors: 0, pass: true }, null, 2));
