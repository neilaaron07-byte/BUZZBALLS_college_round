import assert from "node:assert/strict";
import test from "node:test";
import { cloneFixture } from "../apps/dashboard/src/fixture";
import { auditCsv, auditNarrative, buildAuditSummary, buildHealthSignals, buildReleaseControl, buildReleaseGates, healthSignalLabel, releaseIntentLabel, releaseReadinessLabel, transitionRelease } from "../apps/dashboard/src/release-health-engine";

test("release control joins canary, health, policy, and rollback evidence", () => {
  const control = buildReleaseControl(cloneFixture());
  assert.equal(control.releaseId, "rel_20261010_03");
  assert.equal(control.canaryPercent, 25);
  assert.equal(control.healthSignals.length, 3);
  assert.equal(control.gates.length, 5);
  assert.equal(control.healthScore, 100);
  assert.equal(control.readiness, "review");
  assert.equal(control.tone, "amber");
  assert.match(control.headline, /25% canary/);
  assert.equal(releaseReadinessLabel("blocked"), "Blocked from promote");
});

test("health signals distinguish healthy, degraded, and critical boundaries", () => {
  const healthy = buildHealthSignals();
  const degraded = buildHealthSignals({ errors: 1.7, latency: 1.2, sessions: 98.7 });
  const critical = buildHealthSignals({ errors: 3.8, latency: 1.7, sessions: 94.2 });
  assert.deepEqual(healthy.map((signal) => signal.state), ["healthy", "healthy", "healthy"]);
  assert.deepEqual(degraded.map((signal) => signal.state), ["degraded", "degraded", "degraded"]);
  assert.deepEqual(critical.map((signal) => signal.state), ["critical", "critical", "critical"]);
  assert.equal(healthSignalLabel("degraded"), "Degraded");
  assert.match(critical[0]?.detail ?? "", /rollback threshold/);
});

test("release gates block dangerous findings and keep conflicts amber", () => {
  const fixture = cloneFixture();
  const gates = buildReleaseGates(fixture, buildHealthSignals());
  assert.deepEqual(gates.map((gate) => gate.state), ["passed", "passed", "review", "passed", "passed"]);
  const blocked = buildReleaseGates({ ...fixture, workspace: { ...fixture.workspace, findings: [{ ...fixture.workspace.findings[0]!, severity: "high" }] } });
  assert.equal(blocked.find((gate) => gate.id === "target")?.state, "blocked");
});

test("release transitions preserve conservative promotion and one-click rollback", () => {
  const fixture = cloneFixture();
  const control = buildReleaseControl(fixture, { canaryPercent: 75 });
  const promotion = transitionRelease(control, "promote");
  assert.equal(promotion.allowed, false);
  assert.equal(promotion.event.type, "promotion_rejected");
  const paused = transitionRelease(control, "pause");
  assert.equal(paused.allowed, true);
  assert.equal(paused.control.paused, true);
  const rollback = transitionRelease(control, "rollback");
  assert.equal(rollback.allowed, true);
  assert.equal(rollback.control.rolledBack, true);
  assert.equal(rollback.control.canaryPercent, 0);
  assert.equal(releaseIntentLabel("kill-switch"), "Enable kill switch");
});

test("release transition rejects unsafe resume and reports kill switch protection", () => {
  const fixture = cloneFixture();
  const control = buildReleaseControl(fixture, { paused: true, killSwitchEnabled: true });
  const resume = transitionRelease(control, "resume");
  assert.equal(resume.allowed, false);
  const kill = transitionRelease(buildReleaseControl(fixture), "kill-switch");
  assert.equal(kill.allowed, true);
  assert.equal(kill.control.killSwitchEnabled, true);
  assert.equal(kill.control.readiness, "blocked");
});

test("audit summary exposes a tamperable but deterministic chain", () => {
  const fixture = cloneFixture();
  const summary = buildAuditSummary(fixture);
  const tampered = buildAuditSummary(fixture, true);
  assert.equal(summary.chainValid, true);
  assert.equal(summary.eventCount, 5);
  assert.equal(summary.records[0]?.previousHash, "genesis");
  assert.equal(tampered.chainValid, false);
  assert.equal(tampered.tone, "red");
  assert.match(auditNarrative(summary), /events in the chain/);
  assert.match(auditNarrative(tampered), /broken link/);
});

test("audit CSV keeps actors, hashes, and event details exportable", () => {
  const csv = auditCsv(buildAuditSummary(cloneFixture()));
  assert.match(csv, /id,action,subjectId,actor,occurredAt,tone,hash,previousHash,detail/);
  assert.match(csv, /Maya Singh|Lena Ortiz|Owen Brooks/);
  assert.match(csv, /sha256/);
  assert.match(csv, /Median checkout latency/);
});
