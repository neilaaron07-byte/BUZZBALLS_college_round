import { cloneFixture } from "./fixture";
import type { DashboardData, WorkspaceReadModel } from "./dashboard-types";

interface ApiEnvelope<T> {
  data: T;
  requestId: string;
}

function apiBaseUrl(): string {
  return (typeof window !== "undefined" ? window.__PATCHWORK_API_URL : undefined) ??
    (typeof process !== "undefined" ? process.env.NEXT_PUBLIC_API_URL : undefined) ?? "";
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
  if (!baseUrl && typeof window === "undefined") return cloneFixture();
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

declare global {
  interface Window {
    __PATCHWORK_API_URL?: string;
  }
}
