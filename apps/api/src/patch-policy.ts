import type { Patch, PatchOperation } from "../../../packages/core/src/index";
import { validateOperationSafety } from "../../../packages/core/src/safety";
import type { ApiState } from "./types";

export interface PatchPolicyCheck {
  id: string;
  status: "passed" | "warning" | "failed";
  explanation: string;
}

export interface PatchPolicyResult {
  status: "passed" | "warning" | "blocked";
  checks: readonly PatchPolicyCheck[];
  operationCount: number;
  dependencyDepth: number;
}

function dependencyDepth(state: ApiState, patchId: string, seen = new Set<string>()): number {
  if (seen.has(patchId)) return Number.POSITIVE_INFINITY;
  seen.add(patchId);
  const patch = state.patches.find((candidate) => candidate.identity.id === patchId);
  if (!patch || patch.dependencies.length === 0) return 0;
  return 1 + Math.max(...patch.dependencies.map((dependency) => dependencyDepth(state, dependency, new Set(seen))));
}

function operationSummary(operation: PatchOperation): string {
  if (operation.kind === "style") return `${operation.kind}:${operation.property}`;
  if (operation.kind === "text") return `${operation.kind}:text`; 
  if (operation.kind === "attribute") return `${operation.kind}:${operation.name}`;
  if (operation.kind === "hide") return `${operation.kind}:${operation.hidden ? "hide" : "show"}`;
  if (operation.kind === "reorder") return `${operation.kind}:${operation.direction}`;
  return `${operation.kind}:badge`;
}

export function evaluatePatchPolicy(state: ApiState, patch: Patch): PatchPolicyResult {
  const checks: PatchPolicyCheck[] = [];
  const siteOrigin = state.sites.find((site) => site.id === patch.identity.siteId)?.canonicalOrigin ?? "https://patchwork.invalid/";
  const unsafe = patch.operations.filter((operation) => validateOperationSafety(operation, siteOrigin).length > 0);
  checks.push({ id: "safe-operations", status: unsafe.length === 0 ? "passed" : "failed", explanation: unsafe.length === 0 ? "Every operation passes the core safety boundary." : `${unsafe.length} operation${unsafe.length === 1 ? "" : "s"} failed the core safety boundary.` });
  checks.push({ id: "operation-budget", status: patch.operations.length <= 25 ? "passed" : "warning", explanation: `${patch.operations.length} operation${patch.operations.length === 1 ? "" : "s"}; patches above 25 need an explicit review.` });
  const depth = dependencyDepth(state, patch.identity.id);
  checks.push({ id: "dependency-depth", status: Number.isFinite(depth) && depth <= 5 ? "passed" : "failed", explanation: Number.isFinite(depth) ? `Dependency chain is ${depth} level${depth === 1 ? "" : "s"} deep.` : "Dependency cycle detected; release must stop." });
  const duplicates = new Set(patch.operations.map((operation) => `${operation.target.fingerprint}:${operationSummary(operation)}`)).size !== patch.operations.length;
  checks.push({ id: "duplicate-operations", status: duplicates ? "warning" : "passed", explanation: duplicates ? "Two operations address the same target and property; keep the final intent explicit." : "No duplicate target/property operations were found." });
  const failed = checks.some((check) => check.status === "failed");
  const warning = checks.some((check) => check.status === "warning");
  return { status: failed ? "blocked" : warning ? "warning" : "passed", checks, operationCount: patch.operations.length, dependencyDepth: depth };
}

export function operationLabels(patch: Patch): readonly string[] {
  return patch.operations.map(operationSummary);
}
