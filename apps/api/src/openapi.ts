export interface OpenApiDocument {
  openapi: "3.1.0";
  info: { title: string; version: string; description: string };
  paths: Readonly<Record<string, { get?: { summary: string }; post?: { summary: string }; patch?: { summary: string } }>>;
}

export const openApiDocument: OpenApiDocument = {
  openapi: "3.1.0",
  info: { title: "PATCHWORK API", version: "0.1.0", description: "Evidence-first website hotfix orchestration for SCAN, FIX, and SHIP." },
  paths: {
    "/healthz": { get: { summary: "Process health" } },
    "/readyz": { get: { summary: "Seed and repository readiness" } },
    "/api/sites": { get: { summary: "List managed sites" } },
    "/api/sites/{siteId}/scans": { get: { summary: "List scan runs" }, post: { summary: "Run a deterministic page scan" } },
    "/api/patches": { post: { summary: "Create a validated patch" } },
    "/api/patches/{patchId}/revisions": { get: { summary: "List patch revisions" }, post: { summary: "Create a revision with a stale-base guard" } },
    "/api/verification-runs": { get: { summary: "List stored verification reports" }, post: { summary: "Store a typed verification report" } },
    "/api/releases/{releaseId}/policy": { get: { summary: "Evaluate release policy" } },
    "/api/releases/{releaseId}/rollback": { post: { summary: "Rollback a release and write an audit entry" } },
    "/api/audit/verify": { get: { summary: "Verify the immutable audit chain" } },
  },
};
