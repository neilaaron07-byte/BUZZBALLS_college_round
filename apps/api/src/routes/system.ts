import { Router } from "express";
import { verifyChain } from "../../../../packages/core/src/index";
import { asyncRoute } from "../route-helpers";
import { send } from "../middleware";
import type { ApiContext } from "../types";
import { readState } from "../services";
import { openApiDocument } from "../openapi";
import { resetAllowed, resetDemo } from "../demo-reset";
import { ApiError } from "../errors";

export function systemRoutes(context: ApiContext): Router {
  const router = Router();
  router.get("/healthz", (request, response) => send(request, response, { status: "ok", service: "patchwork-api", uptimeSeconds: Math.round((Date.now() - context.startedAt) / 1000) }));
  router.get("/readyz", async (request, response) => {
    const state = await readState(context);
    send(request, response, { status: state.schemaVersion === 1 ? "ready" : "blocked", schemaVersion: state.schemaVersion, sites: state.sites.length, seededRelease: state.releases.some((release) => release.status === "live") });
  });
  router.get("/metrics", async (request, response) => {
    const state = await readState(context);
    send(request, response, { ...state.metrics, ...context.volatileMetrics, requests: state.metrics.requests + context.volatileMetrics.requests, errors: state.metrics.errors + context.volatileMetrics.errors, idempotentReplays: state.metrics.idempotentReplays + context.volatileMetrics.idempotentReplays, activeSites: state.sites.length, liveReleases: state.releases.filter((release) => release.status === "live").length, openConflicts: state.conflicts.filter((conflict) => !conflict.resolvedAt).length, lastAuditAt: state.auditEntries.at(-1)?.timestamp ?? null });
  });
  router.get("/openapi.json", (request, response) => send(request, response, openApiDocument));
  router.get("/audit", async (request, response) => {
    const state = await readState(context);
    send(request, response, { entries: state.auditEntries, chain: await verifyChain(state.auditEntries) });
  });
  router.post("/demo/reset", asyncRoute(async (request, response) => {
    if (!resetAllowed(process.env.NODE_ENV ?? "development")) throw new ApiError(403, "RESET_DISABLED", "Seed reset is disabled in production.");
    send(request, response, await resetDemo(context));
  }));
  return router;
}
