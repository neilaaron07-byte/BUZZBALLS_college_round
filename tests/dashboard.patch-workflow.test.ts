import assert from "node:assert/strict";
import test from "node:test";
import { cloneFixture } from "../apps/dashboard/src/fixture";
import { allowedPatchProperties, applyConflictDecision, applyReviewDecision, buildPatchDraft, operationValueIsSafe, patchChecksByTone, patchCsv, patchNextAction, patchStateLabel, patchStateTone, patchTimeline, reviewDecisionLabel, reviewDecisionTone, setPreviewState, validatePatchDraft, withOperationValue } from "../apps/dashboard/src/patch-workflow-engine";

function draft() {
  const fixture = cloneFixture();
  const patch = fixture.workspace.patches.at(0);
  assert.ok(patch);
  return buildPatchDraft(fixture, patch);
}

test("patch drafts carry a semantic target, constrained operation, and inverse", () => {
  const value = draft();
  assert.equal(value.operations.length, 1);
  assert.equal(value.operations[0]?.property, "color");
  assert.equal(value.operations[0]?.previousValue, "#777777");
  assert.equal(value.inverseOperations[0]?.value, "#777777");
  assert.equal(value.target.selector, "p[data-product-price]");
  assert.equal(value.target.confidence, .99);
  assert.equal(value.conflict.decision, "unresolved");
});

test("draft validation keeps unresolved conflict and preview visible", () => {
  const value = draft();
  const validation = validatePatchDraft(value);
  assert.equal(validation.valid, false);
  assert.equal(validation.status, "review");
  assert.equal(validation.tone, "amber");
  assert.equal(validation.nextAction, "resolve-conflict");
  assert.equal(patchChecksByTone(validation, "green").length, 3);
  assert.equal(patchChecksByTone(validation, "amber").length, 2);
  assert.match(patchNextAction(validation, value), /overlapping/);
});

test("safe operation updates preserve the inverse while unsafe values are rejected", () => {
  const value = draft();
  const updated = withOperationValue(value, "#0f172a");
  assert.equal(updated.operations[0]?.value, "#0f172a");
  assert.equal(updated.inverseOperations[0]?.value, "#777777");
  assert.equal(operationValueIsSafe("#0f172a"), true);
  assert.equal(operationValueIsSafe("navy"), false);
  assert.equal(operationValueIsSafe("#123"), false);
  const invalid = withOperationValue(value, "var(--danger)");
  assert.equal(validatePatchDraft(invalid).status, "blocked");
});

test("preview and conflict decisions move a draft toward a shippable contract", () => {
  const value = draft();
  const previewed = setPreviewState(value, "ready", "2026-10-10T08:06:00.000Z");
  const kept = applyConflictDecision(previewed, "keep-verified");
  const reviewed = applyReviewDecision(kept, "approved", "Lena Ortiz", "Target and inverse are explicit.");
  const validation = validatePatchDraft(reviewed);
  assert.equal(reviewed.preview.status, "ready");
  assert.equal(reviewed.conflict.decision, "keep-verified");
  assert.equal(reviewed.review.decision, "approved");
  assert.equal(reviewed.state, "approved");
  assert.equal(validation.valid, true);
  assert.equal(validation.status, "safe");
  assert.equal(validation.nextAction, "none");
});

test("review decisions expose plain status language and preserve audit notes", () => {
  const value = draft();
  const requested = applyReviewDecision(value, "changes-requested", "Lena Ortiz", "Attach the latest target screenshot.");
  assert.equal(requested.state, "blocked");
  assert.equal(requested.review.note, "Attach the latest target screenshot.");
  assert.equal(reviewDecisionLabel("changes-requested"), "Changes requested");
  assert.equal(reviewDecisionTone("changes-requested"), "red");
  assert.equal(patchStateLabel("blocked"), "Blocked");
  assert.equal(patchStateTone("approved"), "green");
});

test("patch timeline changes only when evidence or a human decision exists", () => {
  const value = draft();
  assert.equal(patchTimeline(value).length, 3);
  const timeline = patchTimeline(applyReviewDecision(applyConflictDecision(setPreviewState(value, "ready", "2026-10-10T08:06:00.000Z"), "archive-stale"), "approved", "Lena Ortiz", "Archive the stale change."));
  assert.equal(timeline.length, 5);
  assert.equal(timeline[2]?.type, "previewed");
  assert.equal(timeline[3]?.type, "approved");
  assert.equal(timeline[4]?.type, "archived");
});

test("patch CSV is deterministic and documents the inverse operation", () => {
  const value = draft();
  const csv = patchCsv(value, validatePatchDraft(value));
  assert.match(csv, /patchId,revision,target,property,value,inverseValue,state,validation/);
  assert.match(csv, /p\[data-product-price\]/);
  assert.match(csv, /#777777/);
  assert.deepEqual(allowedPatchProperties().slice(0, 4), ["color", "background-color", "font-size", "font-weight"]);
});
