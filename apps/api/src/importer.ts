import { z } from "zod";
import { siteSchema, patchSchema, releaseSchema } from "../../../packages/core/src/index";
import type { ApiState } from "./types";

const importBundleSchema = z.object({ schemaVersion: z.literal(1), sites: z.array(z.unknown()).max(100), patches: z.array(z.unknown()).max(1_000), releases: z.array(z.unknown()).max(1_000) }).strict();

export interface ImportResult {
  accepted: boolean;
  sites: number;
  patches: number;
  releases: number;
  errors: readonly string[];
}

export function validateImport(input: unknown): ImportResult {
  const parsed = importBundleSchema.safeParse(input);
  if (!parsed.success) return { accepted: false, sites: 0, patches: 0, releases: 0, errors: parsed.error.issues.map((issue) => issue.message) };
  const errors: string[] = [];
  for (const [index, site] of parsed.data.sites.entries()) if (!siteSchema.safeParse(site).success) errors.push(`sites[${index}] is not a valid site.`);
  for (const [index, patch] of parsed.data.patches.entries()) if (!patchSchema.safeParse(patch).success) errors.push(`patches[${index}] is not a valid patch.`);
  for (const [index, release] of parsed.data.releases.entries()) if (!releaseSchema.safeParse(release).success) errors.push(`releases[${index}] is not a valid release.`);
  return { accepted: errors.length === 0, sites: parsed.data.sites.length, patches: parsed.data.patches.length, releases: parsed.data.releases.length, errors };
}

export function mergeImportedState(state: ApiState, input: unknown): ApiState {
  const validation = validateImport(input);
  if (!validation.accepted) throw new Error(`Import rejected: ${validation.errors.join(" ")}`);
  const parsed = input as { sites: unknown[]; patches: unknown[]; releases: unknown[] };
  const sites = parsed.sites.map((value) => siteSchema.parse(value));
  const patches = parsed.patches.map((value) => patchSchema.parse(value));
  const releases = parsed.releases.map((value) => releaseSchema.parse(value));
  return { ...state, sites: [...state.sites.filter((site) => !sites.some((incoming) => incoming.id === site.id)), ...sites], patches: [...state.patches.filter((patch) => !patches.some((incoming) => incoming.identity.id === patch.identity.id)), ...patches], releases: [...state.releases.filter((release) => !releases.some((incoming) => incoming.id === release.id)), ...releases] };
}

export function importSummary(result: ImportResult): string {
  return result.accepted ? `Validated ${result.sites} site${result.sites === 1 ? "" : "s"}, ${result.patches} patch${result.patches === 1 ? "" : "es"}, and ${result.releases} release${result.releases === 1 ? "" : "s"}.` : `Import blocked with ${result.errors.length} validation error${result.errors.length === 1 ? "" : "s"}.`;
}
