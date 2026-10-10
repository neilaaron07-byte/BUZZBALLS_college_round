import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("dashboard workflow panels expose recovery, decision graph, and audit handoff contracts", async () => {
  const source = await readFile(new URL("../apps/dashboard/src/dashboard-workflow-panels.tsx", import.meta.url), "utf8");
  assert.match(source, /export function DashboardWorkflowPanels/);
  assert.match(source, /WorkspaceRecoveryPanel/);
  assert.match(source, /AuditActivityPanel/);
  assert.match(source, /WorkflowEmptyState/);
  assert.match(source, /WorkflowErrorState/);
  assert.match(source, /onNavigate\(status\.view\)/);
  assert.match(source, /buildReleaseControl/);
  assert.match(source, /buildAuditSummary/);
});

test("overview includes the typed workflow panel graph after the evidence grid", async () => {
  const source = await readFile(new URL("../apps/dashboard/src/overview-screen.tsx", import.meta.url), "utf8");
  assert.match(source, /DashboardWorkflowPanels/);
  assert.ok(source.indexOf("pw-overview-evidence-grid") < source.indexOf("DashboardWorkflowPanels data={data}"));
  assert.match(source, /onNavigate=\{onNavigate\}/);
});
