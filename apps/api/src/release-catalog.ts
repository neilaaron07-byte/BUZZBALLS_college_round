import type { Release } from "../../../packages/core/src/index";
import type { ApiState } from "./types";
import { releaseSafety } from "./release-safety";
import { releaseTimeline } from "./normalizers";
import { decidePromotion, releaseDiff, rolloutPhase } from "./release-controller";

export interface ReleaseCatalogItem {
  release: Release;
  phase: ReturnType<typeof rolloutPhase>;
  safety: Awaited<ReturnType<typeof releaseSafety>>;
  diff: ReturnType<typeof releaseDiff>;
  nextPromotion: ReturnType<typeof decidePromotion>;
}

export async function catalogRelease(state: ApiState, release: Release): Promise<ReleaseCatalogItem> {
  const rollout = state.rollouts.find((candidate) => candidate.releaseId === release.id) ?? null;
  return { release, phase: rolloutPhase(release, rollout), safety: await releaseSafety(state, release.id), diff: releaseDiff(state, release.id), nextPromotion: decidePromotion(state, release.id, rollout?.canaryPercent === 100 ? 100 : Math.min(100, Math.max(25, (rollout?.canaryPercent ?? 0) + 25))) };
}

export async function releaseCatalog(state: ApiState, siteId: string): Promise<readonly ReleaseCatalogItem[]> {
  return Promise.all(state.releases.filter((release) => release.siteId === siteId).sort((left, right) => right.createdAt.localeCompare(left.createdAt)).map((release) => catalogRelease(state, release)));
}

export function releaseStatusCounts(items: readonly ReleaseCatalogItem[]): Readonly<Record<Release["status"], number>> {
  const statuses: readonly Release["status"][] = ["draft", "review", "verified", "scheduled", "live", "rolled_back", "rejected"];
  return Object.fromEntries(statuses.map((status) => [status, items.filter((item) => item.release.status === status).length])) as Record<Release["status"], number>;
}

export function releaseOverview(state: ApiState, siteId: string): { timeline: ReturnType<typeof releaseTimeline>; live: string | null; canary: readonly string[] } {
  const releases = state.releases.filter((release) => release.siteId === siteId);
  return { timeline: releaseTimeline(releases, state.rollouts), live: releases.find((release) => release.status === "live")?.id ?? null, canary: state.rollouts.filter((rollout) => rollout.canaryPercent > 0 && rollout.canaryPercent < 100).map((rollout) => rollout.releaseId) };
}
