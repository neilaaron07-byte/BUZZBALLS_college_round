import assert from "node:assert/strict";
import test from "node:test";
import { cloneFixture } from "../apps/dashboard/src/fixture";
import { budgetNarrative, budgetProgress, evidenceBrief, evidenceBudgets, evidenceCsv, evidenceForSite, evidenceRecordByKey, evidenceScore, evidenceToneLabel, qualityGateCount, verificationChecks, verificationCsv, verificationNarrative, verificationScore } from "../apps/dashboard/src/evidence-engine";

test("evidence records stay measured, named, and explicit about the Lighthouse gap", () => {
  const records = evidenceForSite(cloneFixture(), 63);
  assert.equal(records.length, 7);
  assert.equal(evidenceScore(records).score, 94);
  assert.deepEqual(evidenceScore(records), { score: 94, passed: 6, review: 1, blocked: 0, posture: "review" });
  assert.equal(evidenceRecordByKey(records, "lighthouse")?.status, "Not measured");
  assert.match(evidenceBrief(records), /Resolver benchmark: 200 scenarios/);
  assert.equal(qualityGateCount(records, "green"), 6);
  assert.equal(evidenceToneLabel("amber"), "Review");
});

test("quality budgets distinguish observed values from a budget that still needs capture", () => {
  const budgets = evidenceBudgets();
  const sdk = budgets.find((budget) => budget.key === "sdk-gzip");
  const lighthouse = budgets.find((budget) => budget.key === "lighthouse-performance");
  assert.equal(sdk?.observed, 7.2);
  assert.equal(budgetProgress(sdk!), 100);
  assert.equal(budgetProgress(lighthouse!), 0);
  assert.match(budgetNarrative(lighthouse!), /not measured yet/);
});

test("verification checks have stable browser evidence and export-safe CSV", () => {
  const checks = verificationChecks();
  assert.equal(checks.length, 5);
  assert.equal(verificationScore(checks), 100);
  assert.match(verificationNarrative(checks), /100%/);
  const csv = evidenceCsv(evidenceForSite(cloneFixture()));
  assert.match(csv, /key,label,value,detail,status,observedAt,source/);
  assert.match(csv, /hidden checkout action/);
  const verification = verificationCsv(checks);
  assert.match(verification, /id,label,observed,detail/);
  assert.match(verification, /Checkout interaction/);
});
