import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { runVerification, type ResolverTargetInput } from "../packages/verifier/src/index";
import { fingerprintFromSnapshot, type ElementSnapshot } from "../packages/core/src/fingerprint";

const outputDirectory = join(process.cwd(), "docs", "evidence", "verifier", "hidden-buy-button");
const viewport = { id: "desktop" as const, width: 1024, height: 720 };
const publishedMarkup = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Aurora travel mug</title><meta name="description" content="Insulated drinkware for the morning commute."></head><body><main><h1>Aurora travel mug</h1><p>Insulated for the morning commute.</p><button data-testid="add-to-cart">Add to cart</button></main></body></html>`;
const patchedMarkup = publishedMarkup.replace("<button data-testid=\"add-to-cart\">", "<button data-testid=\"add-to-cart\" style=\"display:none\">");

function dataUrl(markup: string): string {
  return `data:text/html;charset=utf-8,${encodeURIComponent(markup)}`;
}

function target(): ResolverTargetInput {
  const snapshot: ElementSnapshot = {
    tag: "button",
    attributes: { "data-testid": "add-to-cart" },
    text: "Add to cart",
    path: ["html", "body", "main", "button"],
    siblings: ["button"],
    landmarks: ["main"],
    rect: { top: 100, left: 8, width: 120, height: 40, viewportWidth: viewport.width, viewportHeight: viewport.height },
  };
  return {
    fingerprint: `sha256-${"b".repeat(64)}`,
    evidence: fingerprintFromSnapshot(snapshot),
    expectedTag: "button",
    expectedRole: "button",
    fallbackLabel: "Add to cart",
  };
}

await mkdir(outputDirectory, { recursive: true });
const report = await runVerification({
  id: "rel_20261010_hidden_buy_button",
  publishedUrl: dataUrl(publishedMarkup),
  patchedUrl: dataUrl(patchedMarkup),
  viewports: [viewport],
  target: target(),
  outputDirectory,
  now: () => new Date("2026-10-10T08:00:00.000Z"),
});
const portable = {
  ...report,
  screenshots: report.screenshots.map((screenshot) => ({
    ...screenshot,
    publishedPath: screenshot.publishedPath.replace(`${process.cwd()}/`, ""),
    patchedPath: screenshot.patchedPath.replace(`${process.cwd()}/`, ""),
  })),
};
await writeFile(join(outputDirectory, "report.json"), `${JSON.stringify(portable, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ status: report.status, score: report.score, checks: report.checks.length, evidence: join(outputDirectory, "report.json") }, null, 2));
