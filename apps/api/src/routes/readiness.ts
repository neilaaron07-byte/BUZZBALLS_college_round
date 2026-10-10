import { Router } from "express";
import { send } from "../middleware";
import { getCollaborationCsv, getCollaborationReport, getOperatorBrief, getOperatorBriefCsv, getReleaseDelta, getReleaseDeltaCsv, getReleaseReadiness, getReleaseReadinessComparison, getReleaseReadinessCsv, getReleaseSnapshot, getReleaseSnapshotCsv } from "../services";
import type { ApiContext } from "../types";

export function readinessRoutes(context: ApiContext): Router {
  const router = Router();
  router.get("/releases/:releaseId/readiness", async (request, response) => send(request, response, await getReleaseReadiness(context, request.params.releaseId)));
  router.get("/releases/:releaseId/readiness/compare", async (request, response) => send(request, response, await getReleaseReadinessComparison(context, request.params.releaseId, String(request.query.with ?? ""))));
  router.get("/releases/:releaseId/readiness.csv", async (request, response) => { const csv = await getReleaseReadinessCsv(context, request.params.releaseId); response.type("text/csv").send(csv); });
  router.get("/releases/:releaseId/delta", async (request, response) => send(request, response, await getReleaseDelta(context, request.params.releaseId, String(request.query.with ?? ""))));
  router.get("/releases/:releaseId/delta.csv", async (request, response) => { const csv = await getReleaseDeltaCsv(context, request.params.releaseId, String(request.query.with ?? "")); response.type("text/csv").send(csv); });
  router.get("/releases/:releaseId/snapshot", async (request, response) => send(request, response, await getReleaseSnapshot(context, request.params.releaseId)));
  router.get("/releases/:releaseId/snapshot.csv", async (request, response) => { const csv = await getReleaseSnapshotCsv(context, request.params.releaseId); response.type("text/csv").send(csv); });
  router.get("/sites/:siteId/collaboration", async (request, response) => send(request, response, await getCollaborationReport(context, request.params.siteId)));
  router.get("/sites/:siteId/collaboration.csv", async (request, response) => { const csv = await getCollaborationCsv(context, request.params.siteId); response.type("text/csv").send(csv); });
  router.get("/sites/:siteId/operator-brief", async (request, response) => send(request, response, await getOperatorBrief(context, request.params.siteId, typeof request.query.releaseId === "string" ? request.query.releaseId : undefined)));
  router.get("/sites/:siteId/operator-brief.csv", async (request, response) => { const csv = await getOperatorBriefCsv(context, request.params.siteId, typeof request.query.releaseId === "string" ? request.query.releaseId : undefined); response.type("text/csv").send(csv); });
  return router;
}
