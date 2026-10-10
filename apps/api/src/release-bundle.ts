import { manifestContentHash, type Manifest } from "../../../packages/core/src/index";
import type { VerificationReport } from "../../../packages/verifier/src/index";
import type { ApiState } from "./types";
import { releaseHealthScore } from "./release-controller";
import { publicPatch, releaseTimeline } from "./normalizers";

export interface ReleaseBundle {
  release: ApiState["releases"][number];
  manifest: Manifest;
  manifestHash: string;
  patches: readonly ReturnType<typeof publicPatch>[];
  verification: VerificationReport | null;
  healthScore: number;
  rollout: ApiState["rollouts"][number] | null;
  timeline: ReturnType<typeof releaseTimeline>;
}

export async function buildReleaseBundle(state: ApiState, releaseId: string): Promise<ReleaseBundle | null> {
  const release = state.releases.find((candidate) => candidate.id === releaseId);
  if (!release) return null;
  const patches = state.patches.filter((patch) => release.manifest.patchHashes.includes(patch.revision.contentHash)).map((patch) => publicPatch(patch, state.collaborators));
  const verification = state.verificationReports.find((report) => report.id.includes(releaseId)) ?? null;
  return { release, manifest: release.manifest, manifestHash: await manifestContentHash(release.manifest), patches, verification, healthScore: releaseHealthScore(state, releaseId), rollout: state.rollouts.find((rollout) => rollout.releaseId === releaseId) ?? null, timeline: releaseTimeline(state.releases.filter((candidate) => candidate.siteId === release.siteId), state.rollouts) };
}

export function releaseManifestSummary(manifest: Manifest): { id: string; environment: Manifest["environment"]; patchCount: number; expiresAt: string; killSwitch: boolean } {
  return { id: manifest.releaseId, environment: manifest.environment, patchCount: manifest.patchHashes.length, expiresAt: manifest.expiresAt, killSwitch: manifest.killSwitch.enabled };
}

export function hasExpiredManifest(manifest: Manifest, now = new Date()): boolean {
  return new Date(manifest.expiresAt).getTime() <= now.getTime();
}
