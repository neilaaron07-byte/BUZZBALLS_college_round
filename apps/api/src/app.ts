import express, { type Express } from "express";
import { auditRoutes } from "./routes/audit";
import { collaboratorRoutes } from "./routes/collaborators";
import { conflictRoutes } from "./routes/conflicts";
import { integrationRoutes } from "./routes/integrations";
import { patchRoutes } from "./routes/patches";
import { releaseRoutes } from "./routes/releases";
import { policyRoutes } from "./routes/policies";
import { scanRoutes } from "./routes/scans";
import { siteRoutes } from "./routes/sites";
import { systemRoutes } from "./routes/system";
import { verificationRoutes } from "./routes/verification";
import { dashboardRoutes } from "./routes/dashboard";
import { openApiDocument } from "./openapi";
import { analyticsRoutes } from "./routes/analytics";
import { workspaceRoutes } from "./routes/workspace";
import { operationRoutes } from "./routes/operations";
import { scanDetailRoutes } from "./routes/scan-details";
import { readModelRoutes } from "./routes/read-models";
import { readinessRoutes } from "./routes/readiness";
import { errorHandler, ApiError } from "./errors";
import { rateLimit, requestContext } from "./middleware";
import { JsonRepository } from "./store";
import { createSeedState } from "./seed";
import type { ApiContext } from "./types";
import { liveSiteRoutes } from "./routes/live-sites";
import { aiRoutes } from "./routes/ai";

export interface ApiContextOptions {
  filePath?: string;
  rateLimitPerMinute?: number;
  idempotencyTtlMs?: number;
}

export async function createApiContext(options: ApiContextOptions = {}): Promise<ApiContext> {
  const repository = new JsonRepository({ filePath: options.filePath ?? `${process.cwd()}/.patchwork/state.json`, initial: createSeedState });
  await repository.read();
  return { repository, startedAt: Date.now(), requestCache: new Map(), liveScanJobs: new Map(), runtimeConnections: new Map(), idempotencyTtlMs: options.idempotencyTtlMs ?? 10 * 60_000, volatileMetrics: { requests: 0, errors: 0, idempotentReplays: 0, bytesRejected: 0 } };
}

export function createApiApp(context: ApiContext, options: Pick<ApiContextOptions, "rateLimitPerMinute"> = {}): Express {
  const app = express();
  app.disable("x-powered-by");
  app.use(requestContext(context));
  app.use(rateLimit(context, 60_000, options.rateLimitPerMinute ?? 120));
  app.use(express.json({ limit: "128kb", strict: true }));
  app.get("/", (request, response) => response.json({ data: { service: "patchwork-api", northStar: "SCAN. FIX. SHIP." }, requestId: request.header("x-request-id") ?? "req_unknown" }));
  app.get("/openapi.json", (request, response) => response.json(openApiDocument));
  app.use(systemRoutes(context));
  app.use("/api", siteRoutes(context));
  app.use("/api", scanRoutes(context));
  app.use("/api", collaboratorRoutes(context));
  app.use("/api", policyRoutes(context));
  app.use("/api", dashboardRoutes(context));
  app.use("/api", analyticsRoutes(context));
  app.use("/api", workspaceRoutes(context));
  app.use("/api", operationRoutes(context));
  app.use("/api", scanDetailRoutes(context));
  app.use("/api", readModelRoutes(context));
  app.use("/api", readinessRoutes(context));
  app.use("/api", patchRoutes(context));
  app.use("/api", conflictRoutes(context));
  app.use("/api", verificationRoutes(context));
  app.use("/api", releaseRoutes(context));
  app.use("/api", auditRoutes(context));
  app.use("/api", integrationRoutes(context));
  app.use("/api/v1", liveSiteRoutes(context));
  app.use("/api", liveSiteRoutes(context));
  app.use("/api/v1", aiRoutes());
  app.use("/api", aiRoutes());
  app.use((_request, _response, next) => next(new ApiError(404, "ROUTE_NOT_FOUND", "PATCHWORK could not find that API route.")));
  app.use(errorHandler);
  return app;
}
