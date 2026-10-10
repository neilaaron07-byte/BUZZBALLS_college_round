import { Router } from "express";
import { send } from "../middleware";
import { diagnostics, getAuditReport, getDashboardOverview, getPatchImpact, getPatchPolicy, getReleaseBundle, getReleasePromotion, getReviews, getSecuritySummary, getSiteActivity, searchWorkspace } from "../services";
import type { ApiContext } from "../types";

export function dashboardRoutes(context: ApiContext): Router {
  const router = Router();
  router.get("/dashboard/overview", async (request, response) => send(request, response, await getDashboardOverview(context, String(request.query.siteId ?? "site_shopnest"))));
  router.get("/sites/:siteId/activity", async (request, response) => send(request, response, await getSiteActivity(context, request.params.siteId, typeof request.query.q === "string" ? request.query.q : undefined)));
  router.get("/patches/:patchId/impact", async (request, response) => send(request, response, await getPatchImpact(context, request.params.patchId)));
  router.get("/reviews", async (request, response) => send(request, response, await getReviews(context)));
  router.get("/search", async (request, response) => send(request, response, await searchWorkspace(context, String(request.query.q ?? ""))));
  router.get("/diagnostics", async (request, response) => send(request, response, await diagnostics(context)));
  router.get("/security-summary", async (request, response) => send(request, response, await getSecuritySummary(context)));
  router.get("/audit/report", async (request, response) => send(request, response, await getAuditReport(context)));
  router.get("/patches/:patchId/policy", async (request, response) => send(request, response, await getPatchPolicy(context, request.params.patchId)));
  router.get("/releases/:releaseId/bundle", async (request, response) => send(request, response, await getReleaseBundle(context, request.params.releaseId)));
  router.get("/releases/:releaseId/promotion", async (request, response) => send(request, response, await getReleasePromotion(context, request.params.releaseId, Number(request.query.percent ?? 25))));
  return router;
}
