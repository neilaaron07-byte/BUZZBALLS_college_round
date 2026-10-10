import { Router } from "express";
import { send } from "../middleware";
import { getWorkspaceReadModel, getSiteTimeline, getSiteTimelineCsv } from "../services";
import type { ApiContext } from "../types";

export function readModelRoutes(context: ApiContext): Router {
  const router = Router();
  router.get("/sites/:siteId/workspace", async (request, response) => send(request, response, await getWorkspaceReadModel(context, request.params.siteId)));
  router.get("/sites/:siteId/timeline", async (request, response) => send(request, response, await getSiteTimeline(context, request.params.siteId, request.query as Record<string, unknown>)));
  router.get("/sites/:siteId/timeline.csv", async (request, response) => {
    const csv = await getSiteTimelineCsv(context, request.params.siteId, request.query as Record<string, unknown>);
    response.type("text/csv").send(csv);
  });
  return router;
}
