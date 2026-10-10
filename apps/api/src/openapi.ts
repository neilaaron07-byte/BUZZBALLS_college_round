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
    "/api/sites/{siteId}/workspace": { get: { summary: "Read the typed SCAN/FIX/SHIP workspace model" } },
    "/api/sites/{siteId}/timeline": { get: { summary: "Read cursor-paginated workflow activity" } },
    "/api/sites/{siteId}/timeline.csv": { get: { summary: "Export filtered workflow activity as CSV" } },
    "/api/releases/{releaseId}/readiness": { get: { summary: "Explain every release-readiness gate" } },
    "/api/releases/{releaseId}/readiness/compare": { get: { summary: "Compare release-readiness scores" } },
    "/api/releases/{releaseId}/readiness.csv": { get: { summary: "Export release-readiness checks" } },
    "/api/releases/{releaseId}/delta": { get: { summary: "Compare release changes field by field" } },
    "/api/releases/{releaseId}/delta.csv": { get: { summary: "Export a release delta" } },
    "/api/releases/{releaseId}/snapshot": { get: { summary: "Read the content-hashed release snapshot" } },
    "/api/releases/{releaseId}/snapshot.csv": { get: { summary: "Export the release snapshot" } },
    "/api/sites/{siteId}/collaboration": { get: { summary: "Read review ownership and pull-request readiness" } },
    "/api/sites/{siteId}/collaboration.csv": { get: { summary: "Export the review queue" } },
    "/api/sites/{siteId}/operator-brief": { get: { summary: "Read the operator handoff brief" } },
    "/api/sites/{siteId}/operator-brief.csv": { get: { summary: "Export the operator handoff brief" } },
  },
};
