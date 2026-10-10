import type { OpenApiDocument } from "./openapi";

export interface OpenApiCheck {
  id: string;
  status: "passed" | "failed";
  explanation: string;
}

export function validateOpenApiDocument(document: OpenApiDocument): readonly OpenApiCheck[] {
  const checks: OpenApiCheck[] = [];
  checks.push({ id: "version", status: document.openapi === "3.1.0" ? "passed" : "failed", explanation: `Document version is ${document.openapi}.` });
  checks.push({ id: "title", status: document.info.title.length > 0 ? "passed" : "failed", explanation: document.info.title.length > 0 ? "API title is present." : "API title is missing." });
  checks.push({ id: "health", status: "/healthz" in document.paths ? "passed" : "failed", explanation: "/healthz is documented." });
  checks.push({ id: "scan", status: "/api/sites/{siteId}/scans" in document.paths ? "passed" : "failed", explanation: "Scan lifecycle is documented." });
  checks.push({ id: "patch", status: "/api/patches" in document.paths ? "passed" : "failed", explanation: "Patch creation is documented." });
  checks.push({ id: "release", status: "/api/releases/{releaseId}/rollback" in document.paths ? "passed" : "failed", explanation: "Rollback control is documented." });
  checks.push({ id: "audit", status: "/api/audit/verify" in document.paths ? "passed" : "failed", explanation: "Audit verification is documented." });
  return checks;
}

export function openApiReady(document: OpenApiDocument): boolean {
  return validateOpenApiDocument(document).every((check) => check.status === "passed");
}

export function documentedRoutes(document: OpenApiDocument): readonly string[] {
  return Object.keys(document.paths).sort();
}
