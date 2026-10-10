import { Router } from "express";
import { asyncRoute } from "../route-helpers";
import { getLiveScanJob, liveScanSse, serializeLiveScanJob, startLiveScan, subscribeLiveScan } from "../live-site";
import { send } from "../middleware";
import type { ApiContext } from "../types";

export function liveSiteRoutes(context: ApiContext): Router {
  const router = Router();
  router.post("/live-sites/scan", asyncRoute(async (request, response) => {
    const job = await startLiveScan(context, request.body);
    send(request, response, job, 202);
  }));
  router.get("/live-sites/scans/:jobId", asyncRoute(async (request, response) => {
    send(request, response, serializeLiveScanJob(getLiveScanJob(context, String(request.params.jobId ?? ""))));
  }));
  router.get("/live-sites/scans/:jobId/events", asyncRoute(async (request, response) => {
    const job = getLiveScanJob(context, String(request.params.jobId ?? ""));
    response.status(200).setHeader("content-type", "text/event-stream; charset=utf-8").setHeader("cache-control", "no-cache").setHeader("connection", "keep-alive");
    response.flushHeaders();
    for (const event of job.events) response.write(liveScanSse(event));
    if (job.status === "completed" || job.status === "failed") { response.end(); return; }
    const unsubscribe = subscribeLiveScan(job, (event) => {
      response.write(liveScanSse(event));
      if (event.phase === "completed" || event.phase === "failed") { unsubscribe(); response.end(); }
    });
    request.on("close", () => { unsubscribe(); });
  }));
  return router;
}
