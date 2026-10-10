import assert from "node:assert/strict";
import test from "node:test";
import { cloneFixture } from "../apps/dashboard/src/fixture";
import { buildVerificationRun, compareVerificationRuns, replayVerificationRun, selectedCheckDetail, verificationCheckById, verificationCheckTone, verificationCsv, verificationGateSummary, verificationNarrative, verificationNextActionLabel, verificationProgress, verificationRunStateLabel, verificationRunTone, verificationStateLabel } from "../apps/dashboard/src/verification-workflow-engine";

test("verification run records browser, visual, accessibility, console, and network proof", () => {
  const run = buildVerificationRun(cloneFixture());
  assert.equal(run.state, "passed");
  assert.equal(run.checks.length, 5);
  assert.deepEqual(run.counts, { passed: 5, warnings: 0, failed: 0, skipped: 0 });
  assert.equal(run.score, 100);
  assert.equal(run.matrix.length, 3);
  assert.equal(run.nextAction, "ship");
  assert.match(run.explanation, /isolated browser run/);
});

test("verification state language stays explicit when checks warn or fail", () => {
  const fixture = cloneFixture();
  const warning = buildVerificationRun(fixture, { visual: "warning" });
  const failed = buildVerificationRun(fixture, { interaction: "failed" });
  assert.equal(warning.state, "passed");
  assert.equal(warning.tone, "amber");
  assert.equal(warning.nextAction, "review");
  assert.equal(failed.state, "failed");
  assert.equal(failed.tone, "red");
  assert.equal(failed.nextAction, "block");
  assert.equal(verificationRunStateLabel("failed"), "Verification failed");
  assert.equal(verificationRunTone("expired"), "red");
  assert.equal(verificationStateLabel("warning"), "Review");
});

test("replay produces a new deterministic run id and resets checks from measured state", () => {
  const first = buildVerificationRun(cloneFixture(), { visual: "warning" });
  const replay = replayVerificationRun(first);
  assert.equal(first.replayCount, 1);
  assert.equal(replay.replayCount, 2);
  assert.equal(replay.id.endsWith("_02"), true);
  assert.equal(replay.counts.failed, 0);
  assert.equal(replay.counts.warnings, 0);
  assert.equal(replay.score, 100);
  assert.match(replay.startedAt, /08:01/);
});

test("check lookup and selected detail retain observed versus expected values", () => {
  const run = buildVerificationRun(cloneFixture());
  const interaction = verificationCheckById(run, "interaction");
  assert.equal(interaction?.observed, "12 / 12");
  assert.equal(verificationCheckTone(interaction!), "green");
  assert.match(selectedCheckDetail(run, "interaction"), /expected 12 \/ 12 browser paths/);
  assert.equal(verificationCheckById(run, "network")?.route, "/product/aurora-headphones");
});

test("verification comparison identifies recovered and regressed browser checks", () => {
  const base = buildVerificationRun(cloneFixture());
  const regressed = replayVerificationRun(base, { interaction: "failed", visual: "warning" });
  const regression = compareVerificationRuns(base, regressed);
  assert.equal(regression.regressed, 2);
  assert.equal(regression.improved, 0);
  assert.equal(regression.tone, "red");
  assert.match(regression.summary, /regressed/);
  const recovered = replayVerificationRun(regressed);
  const recovery = compareVerificationRuns(regressed, recovered);
  assert.equal(recovery.improved, 2);
  assert.equal(recovery.regressed, 0);
  assert.equal(recovery.tone, "green");
  assert.match(recovery.summary, /recovered/);
});

test("verification progress and gate summary use stable counts", () => {
  const run = buildVerificationRun(cloneFixture(), { network: "skipped" });
  assert.equal(verificationProgress(run), 100);
  assert.deepEqual(verificationGateSummary(run).map((item) => item.value), ["4", "0", "0", "#1"]);
  assert.equal(verificationNextActionLabel(run), "Review amber evidence");
  assert.match(verificationNarrative(run), /amber checks/);
});

test("verification CSV preserves route, timing, and expected evidence", () => {
  const csv = verificationCsv(buildVerificationRun(cloneFixture()));
  assert.match(csv, /id,category,label,state,observed,expected,durationMs,route/);
  assert.match(csv, /Checkout interaction/);
  assert.match(csv, /1220/);
  assert.match(csv, /product\/aurora-headphones/);
});
