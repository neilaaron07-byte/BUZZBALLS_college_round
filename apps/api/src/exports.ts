import type { Manifest } from "../../../packages/core/src/index";
import type { VerificationReport } from "../../../packages/verifier/src/index";
import { buildAuditReport } from "./audit-report";
import { activityFromState, publicPatch, publicSite } from "./normalizers";
import type { ApiState } from "./types";

export interface WorkspaceExport {
  schemaVersion: 1;
  exportedAt: string;
  site: ReturnType<typeof publicSite>;
  patches: readonly ReturnType<typeof publicPatch>[];
  releases: readonly { id: string; status: string; manifest: Manifest }[];
  reports: readonly VerificationReport[];
  activity: ReturnType<typeof activityFromState>;
  audit: Awaited<ReturnType<typeof buildAuditReport>>;
}

export async function exportWorkspace(state: ApiState, siteId: string, now = new Date()): Promise<WorkspaceExport | null> {
  const site = state.sites.find((candidate) => candidate.id === siteId);
  if (!site) return null;
  const releases = state.releases.filter((release) => release.siteId === siteId).map((release) => ({ id: release.id, status: release.status, manifest: release.manifest }));
  const releaseIds = new Set(releases.map((release) => release.id));
  return { schemaVersion: 1, exportedAt: now.toISOString(), site: publicSite(site), patches: state.patches.filter((patch) => patch.identity.siteId === siteId).map((patch) => publicPatch(patch, state.collaborators)), releases, reports: state.verificationReports.filter((report) => releaseIds.has(report.id.replace("verify_", ""))), activity: activityFromState(state, siteId), audit: await buildAuditReport(state) };
}

export function exportFilename(siteId: string, extension: "json" | "csv", now = new Date()): string {
  return `${siteId}-${now.toISOString().slice(0, 10)}.${extension}`;
}

export function isSafeExport(value: unknown): value is WorkspaceExport {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return record.schemaVersion === 1 && typeof record.exportedAt === "string" && typeof record.site === "object" && Array.isArray(record.patches) && Array.isArray(record.releases);
}
