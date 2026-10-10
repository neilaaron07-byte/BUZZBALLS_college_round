import { chromium, type Browser, type BrowserContext, type Page } from "playwright";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import type { VerificationCheck, VerificationConfig, VerificationReport, ViewportSpec } from "./contracts";
import { runInteractionSuite } from "./interactions";
import { checkAccessibility } from "./accessibility";
import { captureVisualEvidence } from "./visual";
import { checkResolution } from "./resolution";

const DEFAULT_VIEWPORTS: readonly ViewportSpec[] = [
  { id: "desktop", width: 1440, height: 900 },
  { id: "tablet", width: 1024, height: 900 },
  { id: "mobile", width: 390, height: 844 },
];

function loadCheck(url: string, responseOk: boolean, status: number | undefined, startedAt: number): VerificationCheck {
  return { id: `load-${url}`, kind: "load", label: "Page load", status: responseOk ? "passed" : "failed", blocking: true, explanation: responseOk ? `Loaded${status === undefined ? " without an HTTP response" : ` HTTP ${status}`}.` : `The page returned HTTP ${status ?? "no response"}.`, durationMs: Date.now() - startedAt, evidence: [url] };
}

function instrument(page: Page): { consoleErrors: string[]; networkErrors: string[] } {
  const consoleErrors: string[] = [];
  const networkErrors: string[] = [];
  page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });
  page.on("pageerror", (error) => consoleErrors.push(error.message));
  page.on("requestfailed", (request) => networkErrors.push(`${request.method()} ${request.url()} — ${request.failure()?.errorText ?? "failed"}`));
  return { consoleErrors, networkErrors };
}

async function verifyPage(page: Page, url: string, viewport: ViewportSpec, target: VerificationConfig["target"]): Promise<{ checks: VerificationCheck[]; page: Page; signals: { consoleErrors: string[]; networkErrors: string[] } }> {
  const startedAt = Date.now();
  const signals = instrument(page);
  const response = await page.goto(url, { waitUntil: "networkidle", timeout: 30_000 });
  const checks: VerificationCheck[] = [loadCheck(url, response === null || Boolean(response?.ok()), response?.status(), startedAt)];
  if (target) {
    checks.push(await checkResolution(page, target));
  }
  checks.push(...await runInteractionSuite(page));
  checks.push(await checkAccessibility(page, `accessibility-${viewport.id}`));
  checks.push({ id: `console-${viewport.id}`, kind: "console", label: "Console errors", status: signals.consoleErrors.length === 0 ? "passed" : "failed", blocking: true, explanation: signals.consoleErrors.length === 0 ? "No console errors were emitted." : `${signals.consoleErrors.length} console error${signals.consoleErrors.length === 1 ? "" : "s"} emitted.`, durationMs: 0, evidence: signals.consoleErrors.slice(0, 10) });
  checks.push({ id: `network-${viewport.id}`, kind: "network", label: "Network failures", status: signals.networkErrors.length === 0 ? "passed" : "warning", blocking: false, explanation: signals.networkErrors.length === 0 ? "No network requests failed." : `${signals.networkErrors.length} request${signals.networkErrors.length === 1 ? "" : "s"} failed.`, durationMs: 0, evidence: signals.networkErrors.slice(0, 10) });
  return { checks, page, signals };
}

export async function runVerification(config: VerificationConfig): Promise<VerificationReport> {
  const viewports = config.viewports ?? DEFAULT_VIEWPORTS;
  const outputDirectory = config.outputDirectory ?? join(process.cwd(), "docs", "evidence", "verifier", config.id);
  await mkdir(outputDirectory, { recursive: true });
  const browser: Browser = await (config.browserType ?? chromium).launch({ headless: true });
  const screenshots = [];
  const checks: VerificationCheck[] = [];
  try {
    for (const viewport of viewports) {
      const publishedContext: BrowserContext = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height } });
      const patchedContext: BrowserContext = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height } });
      const publishedPage = await publishedContext.newPage();
      const patchedPage = await patchedContext.newPage();
      const published = await verifyPage(publishedPage, config.publishedUrl, viewport, config.target);
      const patched = await verifyPage(patchedPage, config.patchedUrl, viewport, config.target);
      checks.push(...published.checks.map((check) => ({ ...check, id: `published-${viewport.id}-${check.id}` })));
      checks.push(...patched.checks.map((check) => ({ ...check, id: `patched-${viewport.id}-${check.id}` })));
      const visual = await captureVisualEvidence(published.page, patched.page, viewport, outputDirectory);
      screenshots.push(visual);
      checks.push({ id: `visual-${viewport.id}`, kind: "visual", label: "Visual evidence", status: "passed", blocking: false, explanation: visual.changedPixels === 0 ? "Published and patched screenshots are visually identical." : `Captured ${visual.changedPixels.toLocaleString()} changed pixels for review.`, durationMs: 0, evidence: [visual.publishedPath, visual.patchedPath] });
      await publishedContext.close();
      await patchedContext.close();
    }
  } finally {
    await browser.close();
  }
  const blocking = checks.filter((check) => check.blocking);
  const passed = blocking.filter((check) => check.status === "passed").length;
  const score = blocking.length === 0 ? 0 : Math.round((passed / blocking.length) * 100);
  const failed = blocking.filter((check) => check.status === "failed");
  const warnings = checks.filter((check) => check.status === "warning");
  return {
    schemaVersion: 1,
    id: config.id,
    createdAt: (config.now ?? (() => new Date()))().toISOString(),
    publishedUrl: config.publishedUrl,
    patchedUrl: config.patchedUrl,
    viewports,
    checks,
    screenshots,
    score,
    status: failed.length > 0 ? "blocked" : warnings.length > 0 ? "warning" : "passed",
    summary: failed.length > 0 ? `${failed.length} blocking verification check${failed.length === 1 ? "" : "s"} failed; release is blocked.` : warnings.length > 0 ? `${warnings.length} non-blocking warning${warnings.length === 1 ? "" : "s"} need review.` : "All blocking verification checks passed.",
  };
}
