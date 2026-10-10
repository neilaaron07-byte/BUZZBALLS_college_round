import { cloneFixture } from "./fixture";
import type { DashboardData, WorkspaceReadModel } from "./dashboard-types";

interface ApiEnvelope<T> {
  data: T;
  requestId: string;
}

export interface PrivatePreview {
  patchId: string;
  previewUrl: string;
  expiresAt: string;
  source: "api" | "seed";
}

function apiBaseUrl(): string {
  const configured = (typeof window !== "undefined" ? window.__PATCHWORK_API_URL : undefined) ??
    (typeof process !== "undefined" ? process.env.NEXT_PUBLIC_API_URL : undefined);
  if (configured) return configured;
  if (typeof window !== "undefined" && ["localhost", "127.0.0.1"].includes(window.location.hostname)) return "http://127.0.0.1:8787";
  return "";
}

function siteFromWorkspace(workspace: WorkspaceReadModel): DashboardData["site"] {
  const release = workspace.release;
  return {
    id: workspace.site.id,
    name: workspace.site.name,
    repository: workspace.site.repository,
    environment: release?.environment ?? "production",
    releaseVersion: release?.version ?? "No release",
    releaseTitle: release?.title ?? "No production release",
    owner: workspace.site.owner.name,
  };
}

export async function loadDashboardData(signal?: AbortSignal): Promise<DashboardData> {
  const baseUrl = apiBaseUrl();
  if (!baseUrl) return cloneFixture();
  try {
    const response = await fetch(`${baseUrl}/api/sites/site_shopnest/workspace`, { headers: { accept: "application/json" }, signal, cache: "no-store" });
    if (!response.ok) throw new Error(`Workspace request returned ${response.status}.`);
    const envelope = await response.json() as ApiEnvelope<WorkspaceReadModel>;
    if (!envelope.data?.site || !envelope.data.stages) throw new Error("Workspace response was incomplete.");
    return { site: siteFromWorkspace(envelope.data), workspace: envelope.data, updatedAt: envelope.data.generatedAt, source: "api" };
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    return cloneFixture();
  }
}

export async function createPrivatePreview(patchId: string): Promise<PrivatePreview> {
  const baseUrl = apiBaseUrl();
  if (baseUrl) {
    try {
      const response = await fetch(`${baseUrl}/api/patches/${encodeURIComponent(patchId)}/preview`, { method: "POST", headers: { "content-type": "application/json", accept: "application/json" }, body: JSON.stringify({ ttlMinutes: 30 }) });
      if (response.ok) {
        const envelope = await response.json() as ApiEnvelope<{ patchId: string; previewUrl: string; expiresAt: string }>;
        return { ...envelope.data, source: "api" };
      }
    } catch {
      // The deterministic local preview below keeps the demo usable without hiding the API failure.
    }
  }
  const expiresAt = new Date(Date.now() + 30 * 60_000).toISOString();
  return { patchId, previewUrl: `https://preview.patchwork.example/${patchId}?expires=${encodeURIComponent(expiresAt)}`, expiresAt, source: "seed" };
}

declare global {
  interface Window {
    __PATCHWORK_API_URL?: string;
  }
}
