import { manifestSchema, manifestContentHash, type Manifest } from "../../../packages/core/src/index";
import type { ApiState } from "./types";
import { ApiError } from "./errors";

export interface ManifestCheck {
  id: string;
  status: "passed" | "warning" | "failed";
  explanation: string;
}

export interface ManifestReport {
  manifest: Manifest;
  hash: string;
  checks: readonly ManifestCheck[];
  status: "green" | "amber" | "red";
}

export async function manifestReport(manifest: Manifest, state: ApiState, now = new Date()): Promise<ManifestReport> {
  const checks: ManifestCheck[] = [];
  const release = state.releases.find((candidate) => candidate.id === manifest.releaseId);
  checks.push({ id: "release-reference", status: release ? "passed" : "failed", explanation: release ? "Manifest release reference is present." : "Manifest release reference is missing." });
  const expired = new Date(manifest.expiresAt).getTime() <= now.getTime();
  checks.push({ id: "expiry", status: expired ? "failed" : "passed", explanation: expired ? "Manifest has expired." : `Manifest expires ${manifest.expiresAt}.` });
  checks.push({ id: "patches", status: manifest.patchHashes.length === 0 ? "warning" : "passed", explanation: manifest.patchHashes.length === 0 ? "Manifest contains no patch hashes." : `${manifest.patchHashes.length} patch hash${manifest.patchHashes.length === 1 ? "" : "es"} are attached.` });
  checks.push({ id: "kill-switch", status: manifest.killSwitch.enabled ? "failed" : "passed", explanation: manifest.killSwitch.enabled ? `Kill switch enabled: ${manifest.killSwitch.reason ?? "no reason supplied"}.` : "Kill switch is disabled." });
  const failed = checks.some((check) => check.status === "failed");
  const warning = checks.some((check) => check.status === "warning");
  return { manifest, hash: await manifestContentHash(manifest), checks, status: failed ? "red" : warning ? "amber" : "green" };
}

export function parseManifest(input: unknown): Manifest {
  const parsed = manifestSchema.safeParse(input);
  if (!parsed.success) throw new ApiError(400, "INVALID_MANIFEST", "Manifest does not match the signed release schema.", parsed.error.issues.map((issue) => issue.message));
  return parsed.data;
}

export function patchHashesForRelease(state: ApiState, releaseId: string): readonly string[] {
  return state.releases.find((release) => release.id === releaseId)?.manifest.patchHashes ?? [];
}
