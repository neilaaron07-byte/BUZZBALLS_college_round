import { randomUUID } from "node:crypto";
import type { Manifest } from "../../../packages/core/src/index";
import type { ApiContext, PreviewRecord } from "./types";
import { ApiError, notFound } from "./errors";
import { findPatch, updateState } from "./services";

export interface PreviewHealth {
  id: string;
  status: PreviewRecord["status"];
  remainingMinutes: number;
  expired: boolean;
  patchId: string;
  releaseId: string;
}

function currentTime(): number {
  return Date.now();
}

function previewHealth(preview: PreviewRecord, now = currentTime()): PreviewHealth {
  const expiresAt = new Date(preview.expiresAt).getTime();
  const expired = expiresAt <= now;
  return { id: preview.id, status: expired && preview.status === "active" ? "expired" : preview.status, remainingMinutes: Math.max(0, Math.ceil((expiresAt - now) / 60_000)), expired, patchId: preview.patchId, releaseId: preview.releaseId };
}

export async function createPreviewRecord(context: ApiContext, patchId: string, ttlMinutes: number, ownerId: string): Promise<PreviewRecord> {
  return updateState(context, (state) => {
    const patch = findPatch(state, patchId);
    const release = state.releases.find((candidate) => candidate.siteId === patch.identity.siteId && candidate.status === "live");
    if (!release) throw new ApiError(409, "NO_LIVE_RELEASE", "A live release is required to create a private preview.");
    const now = new Date();
    const expiresAt = new Date(now.getTime() + Math.min(120, Math.max(5, ttlMinutes)) * 60_000).toISOString();
    const manifest: Manifest = { version: 1, siteId: patch.identity.siteId, releaseId: `preview_${patch.identity.id}_${randomUUID().slice(0, 8)}`, environment: "preview", baseHash: release.manifest.baseHash, patchHashes: [patch.revision.contentHash], createdAt: now.toISOString(), expiresAt, killSwitch: { enabled: false, reason: null, enabledAt: null, enabledBy: null } };
    const preview: PreviewRecord = { id: `preview_${randomUUID().replaceAll("-", "").slice(0, 12)}`, patchId, releaseId: release.id, manifest, previewUrl: `https://preview.patchwork.example/${patch.identity.id}/${manifest.releaseId}`, status: "active", createdAt: now.toISOString(), expiresAt };
    if (!state.collaborators.some((collaborator) => collaborator.author.id === ownerId)) throw notFound("Collaborator", ownerId);
    return { ...state, previews: [...state.previews, preview] };
  }, (state) => state.previews.at(-1) as PreviewRecord);
}

export async function listPreviews(context: ApiContext, patchId?: string): Promise<readonly PreviewHealth[]> {
  const state = await context.repository.read();
  const updated = state.previews.map((preview) => previewHealth(preview));
  if (updated.some((preview, index) => preview.status !== state.previews[index]?.status)) await context.repository.update((current) => ({ ...current, previews: current.previews.map((preview) => ({ ...preview, status: previewHealth(preview).status })) }));
  return updated.filter((preview) => !patchId || preview.patchId === patchId);
}

export async function revokePreview(context: ApiContext, previewId: string): Promise<PreviewRecord> {
  return updateState(context, (state) => { const preview = state.previews.find((candidate) => candidate.id === previewId); if (!preview) throw notFound("Preview", previewId); return { ...state, previews: state.previews.map((candidate) => candidate.id === previewId ? { ...candidate, status: "revoked" as const } : candidate) }; }, (state) => state.previews.find((preview) => preview.id === previewId) as PreviewRecord);
}

export function previewHeaders(preview: PreviewRecord): Readonly<Record<string, string>> {
  return { "cache-control": "no-store", "x-patchwork-preview": preview.id, "x-patchwork-expires": preview.expiresAt };
}
