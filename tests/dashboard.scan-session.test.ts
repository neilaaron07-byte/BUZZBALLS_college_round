import assert from "node:assert/strict";
import test from "node:test";
import { cloneFixture } from "../apps/dashboard/src/fixture";
import { buildScanSession, compareScanSessions, detectorById, detectorStateLabel, detectorStateTone, filterDetectors, filterScanFindings, rerunScanSession, scanCsv, scanFilterSummary, scanStatusLabel, scanStatusTone, triageFinding } from "../apps/dashboard/src/scan-session-engine";

test("scan sessions expose all supported detectors and measured ShopNest evidence", () => {
  const session = buildScanSession(cloneFixture());
  assert.equal(session.status, "completed");
  assert.equal(session.runCount, 1);
  assert.equal(session.detectors.length, 6);
  assert.equal(session.totals.findingCount, 1);
  assert.equal(session.totals.criticalCount, 0);
  assert.equal(session.totals.clearCount, 5);
  assert.equal(session.tone, "amber");
  assert.match(session.headline, /1 finding/);
  assert.match(session.explanation, /mobile viewport|product route/i);
});

test("detector helpers preserve clear, finding, and status language", () => {
  const session = buildScanSession(cloneFixture());
  const contrast = detectorById(session, "contrast");
  const overflow = detectorById(session, "layout-overflow");
  assert.equal(contrast?.state, "finding");
  assert.equal(contrast?.tone, "amber");
  assert.equal(overflow?.state, "clear");
  assert.equal(detectorStateLabel("blocked"), "Blocked");
  assert.equal(detectorStateTone("clear"), "green");
  assert.equal(scanStatusLabel("completed"), "Scan completed");
  assert.equal(scanStatusTone("failed"), "red");
});

test("scan search and finding filters are deterministic", () => {
  const session = buildScanSession(cloneFixture());
  const finding = session.findings.at(0);
  assert.ok(finding);
  assert.equal(filterDetectors(session, "checkout").length, 1);
  assert.equal(filterDetectors(session, "not present").length, 0);
  assert.equal(filterScanFindings(session, "all").length, 1);
  assert.equal(filterScanFindings({ ...session, reviewedFindingIds: [finding.id] }, "reviewed").length, 1);
  assert.equal(filterScanFindings(session, "blocked").length, 0);
  assert.equal(scanFilterSummary(session, "open"), "1 open finding");
});

test("triage blocks dangerous findings and requests evidence below the threshold", () => {
  const fixture = cloneFixture();
  const finding = fixture.workspace.findings.at(0);
  assert.ok(finding);
  assert.deepEqual(triageFinding(finding), { tone: "amber", state: "open", label: "Open review", explanation: "The finding has a strong target match but still needs a human decision before FIX.", nextAction: "review" });
  assert.equal(triageFinding(finding, true).state, "reviewed");
  assert.equal(triageFinding({ ...finding, confidence: .71 }).nextAction, "capture-evidence");
  assert.equal(triageFinding({ ...finding, severity: "high" }).state, "blocked");
});

test("rerun keeps detector history and reports unchanged evidence", () => {
  const first = buildScanSession(cloneFixture());
  const second = rerunScanSession(first);
  const comparison = compareScanSessions(first, second);
  assert.equal(second.runCount, 2);
  assert.equal(second.id.endsWith("_02"), true);
  assert.equal(comparison.newFindings, 0);
  assert.equal(comparison.resolvedFindings, 0);
  assert.equal(comparison.unchangedFindings, 1);
  assert.equal(comparison.detectorChanges.length, 0);
  assert.equal(comparison.tone, "amber");
  assert.match(comparison.summary, /unchanged/);
});

test("scan comparison distinguishes new and resolved findings", () => {
  const first = buildScanSession(cloneFixture());
  const finding = first.findings.at(0);
  assert.ok(finding);
  const cleared = rerunScanSession(first, []);
  const resolved = compareScanSessions(first, cleared);
  assert.equal(resolved.resolvedFindings, 1);
  assert.equal(resolved.newFindings, 0);
  assert.equal(resolved.tone, "green");
  const newFinding = { ...finding, id: "finding_new_mobile_overflow", summary: "Mobile product card overflows" };
  const added = rerunScanSession(first, [newFinding]);
  const appeared = compareScanSessions(first, added);
  assert.equal(appeared.newFindings, 1);
  assert.equal(appeared.tone, "red");
});

test("scan CSV is export-safe and contains detector evidence", () => {
  const csv = scanCsv(buildScanSession(cloneFixture()));
  assert.match(csv, /detector,label,state,findings,confidence,route,nextAction/);
  assert.match(csv, /contrast/);
  assert.match(csv, /Contrast boundary/);
  assert.match(csv, /products\/aurora/);
});
