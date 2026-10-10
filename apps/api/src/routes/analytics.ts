import { Router } from "express";
import { send } from "../middleware";
import { getDomainEvents, getFindingTrend, getSiteAnalytics } from "../services";
import type { ApiContext } from "../types";

export function analyticsRoutes(context: ApiContext): Router {
  const router = Router();
  router.get("/analytics/sites/:siteId", async (request, response) => send(request, response, await getSiteAnalytics(context, request.params.siteId)));
  router.get("/analytics/sites/:siteId/finding-trend", async (request, response) => send(request, response, await getFindingTrend(context, request.params.siteId)));
  router.get("/events", async (request, response) => send(request, response, await getDomainEvents(context, typeof request.query.siteId === "string" ? request.query.siteId : undefined)));
  return router;
}
