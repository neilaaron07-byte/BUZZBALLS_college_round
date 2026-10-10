import { verifyChain, type Manifest } from "../../../packages/core/src/index";
import type { ApiState } from "./types";
import { evaluateReleasePolicy } from "./policies";
import { evaluateHealth, type HealthPolicy } from "./health-policy";
import { hasExpiredManifest } from "./release-bundle";

export interface ReleaseSafetyReport {
  releaseId: string;
  status: "green" | "amber" | "red";
  policy: ReturnType<typeof evaluateReleasePolicy>;
  health: ReturnType<typeof evaluateHealth>;
  integrity: { auditChainValid: boolean; manifestExpired: boolean; manifestHasPatches: boolean };
  explanation: string;
}

export async function releaseSafety(state: ApiState, releaseId: string, now = new Date(), healthPolicy?: HealthPolicy): Promise<ReleaseSafetyReport | null> {
  const release = state.releases.find((candidate) => candidate.id === releaseId);
  if (!release) return null;
  const policy = evaluateReleasePolicy(state, release);
  const health = evaluateHealth(state, releaseId, healthPolicy);
  const audit = await verifyChain(state.auditEntries);
  const integrity = { auditChainValid: audit.valid, manifestExpired: hasExpiredManifest(release.manifest, now), manifestHasPatches: release.manifest.patchHashes.length > 0 };
  const red = policy.status === "blocked" || health.status === "critical" || !integrity.auditChainValid || integrity.manifestExpired;
  const amber = policy.status === "warning" || health.status === "degraded" || !integrity.manifestHasPatches;
  return { releaseId, status: red ? "red" : amber ? "amber" : "green", policy, health, integrity, explanation: red ? "Release is blocked until its failed integrity, health, or policy checks are resolved." : amber ? "Release has review signals that should be acknowledged before promotion." : "Release meets the supplied safety checks." };
}

export function manifestSafety(manifest: Manifest, now = new Date()): { expired: boolean; hasPatches: boolean; killSwitch: boolean; status: "green" | "amber" | "red" } {
  const expired = hasExpiredManifest(manifest, now);
  const hasPatches = manifest.patchHashes.length > 0;
  const killSwitch = manifest.killSwitch.enabled;
  return { expired, hasPatches, killSwitch, status: expired || killSwitch ? "red" : hasPatches ? "green" : "amber" };
}
