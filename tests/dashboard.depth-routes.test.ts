import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = (name: string) => readFile(new URL(`../apps/dashboard/src/${name}`, import.meta.url), "utf8");

test("SCAN route consumes the scan-session model and exports measured detector evidence", async () => {
  const content = await source("scan-screen.tsx");
  assert.match(content, /buildScanSession/);
  assert.match(content, /filterScanFindings/);
  assert.match(content, /scanCsv/);
  assert.match(content, /Detector matrix/);
});

test("FIX route consumes draft validation and prevents unsafe operation saves", async () => {
  const content = await source("patches-screen.tsx");
  assert.match(content, /buildPatchDraft/);
  assert.match(content, /validatePatchDraft/);
  assert.match(content, /operationValueIsSafe/);
  assert.match(content, /PatchSafetyPanel/);
});

test("verification route consumes replayable browser evidence", async () => {
  const content = await source("verification-screen.tsx");
  assert.match(content, /buildVerificationRun/);
  assert.match(content, /replayVerificationRun/);
  assert.match(content, /verificationCsv/);
  assert.match(content, /Export proof/);
});

test("SHIP routes consume release health and hash-linked audit models", async () => {
  const releases = await source("releases-screen.tsx");
  const audit = await source("audit-screen.tsx");
  assert.match(releases, /buildReleaseControl/);
  assert.match(releases, /ReleaseHealthBoundary/);
  assert.match(audit, /buildAuditSummary/);
  assert.match(audit, /auditCsv/);
});

test("Overview keeps recovery and decision graph reachable after the evidence panels", async () => {
  const content = await source("overview-screen.tsx");
  assert.match(content, /DashboardWorkflowPanels/);
  assert.match(content, /WorkspaceSeam/);
  assert.ok(content.indexOf("<DashboardWorkflowPanels") > content.indexOf("PolicyChecklist"));
});
