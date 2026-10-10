import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { fingerprintFromSnapshot, type ElementSnapshot } from "../packages/core/src/fingerprint";
import { parseVerificationReport, replayVerificationReport, runVerification, type ResolverTargetInput } from "../packages/verifier/src/index";

const viewport = { id: "desktop" as const, width: 1024, height: 720 };
const publishedMarkup = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Aurora travel mug</title></head><body><main><h1>Aurora travel mug</h1><p>Insulated for the morning commute.</p><button data-testid="add-to-cart">Add to cart</button></main></body></html>`;
const patchedMarkup = publishedMarkup.replace("<button data-testid=\"add-to-cart\">", "<button data-testid=\"add-to-cart\" style=\"display:none\">");

function dataUrl(markup: string): string {
  return `data:text/html;charset=utf-8,${encodeURIComponent(markup)}`;
}

function targetInput(): ResolverTargetInput {
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

test("verifier blocks a hidden Buy button and stores reviewable evidence", async () => {
  const outputDirectory = await mkdtemp(join(tmpdir(), "patchwork-verifier-"));
  try {
    const report = await runVerification({
      id: "rel_20261010_hidden_buy_button",
      publishedUrl: dataUrl(publishedMarkup),
      patchedUrl: dataUrl(patchedMarkup),
      viewports: [viewport],
      target: targetInput(),
      outputDirectory,
      now: () => new Date("2026-10-10T08:00:00.000Z"),
    });
    assert.equal(report.status, "blocked");
    assert.match(report.summary, /release is blocked/);
    const hiddenButtonCheck = report.checks.find((check) => check.id.startsWith("patched-desktop-interaction-add-to-cart"));
    assert.equal(hiddenButtonCheck?.status, "failed");
    assert.equal(hiddenButtonCheck?.blocking, true);
    assert.equal(report.screenshots.length, 1);
    assert.ok((report.screenshots[0]?.changedPixels ?? 0) > 0);

    const reportPath = join(outputDirectory, "report.json");
    await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
    const replayed = await replayVerificationReport(reportPath);
    assert.equal(replayed.status, "blocked");
    assert.equal(replayed.checks.length, report.checks.length);
    assert.deepEqual(parseVerificationReport(JSON.parse(await readFile(reportPath, "utf8")) as unknown).screenshots, report.screenshots);
  } finally {
    await rm(outputDirectory, { recursive: true, force: true });
  }
});

test("offline report replay rejects incompatible stored evidence", () => {
  assert.throws(() => parseVerificationReport({ schemaVersion: 2, id: "old", checks: [], viewports: [] }), /incompatible/);
});
