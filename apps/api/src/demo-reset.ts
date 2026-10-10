import { createSeedState } from "./seed";
import type { ApiContext } from "./types";
import { updateState } from "./services";

export interface DemoResetResult {
  reset: true;
  sites: number;
  patches: number;
  releases: number;
  resetAt: string;
}

export async function resetDemo(context: ApiContext, now = new Date()): Promise<DemoResetResult> {
  const seed = await createSeedState();
  await context.repository.write(seed);
  return { reset: true, sites: seed.sites.length, patches: seed.patches.length, releases: seed.releases.length, resetAt: now.toISOString() };
}

export async function resetDemoTransactionally(context: ApiContext, now = new Date()): Promise<DemoResetResult> {
  const seed = await createSeedState();
  const next = await updateState(context, () => seed, (state) => state);
  return { reset: true, sites: next.sites.length, patches: next.patches.length, releases: next.releases.length, resetAt: now.toISOString() };
}

export function resetAllowed(environment: string): boolean {
  return environment !== "production";
}

export function resetMessage(result: DemoResetResult): string {
  return `PATCHWORK demo reset at ${result.resetAt}: ${result.sites} site, ${result.patches} patch, ${result.releases} release records restored.`;
}
