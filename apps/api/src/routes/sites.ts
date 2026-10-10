import { Router } from "express";
import { send, requireSiteId } from "../middleware";
import { findSite, readState } from "../services";
import type { ApiContext } from "../types";

export function siteRoutes(context: ApiContext): Router {
  const router = Router();
  router.get("/sites", async (request, response) => send(request, response, (await readState(context)).sites));
  router.get("/sites/:siteId", async (request, response) => { const state = await readState(context); send(request, response, findSite(state, request.params.siteId)); });
  router.get("/sites/:siteId/environments", async (request, response) => { const state = await readState(context); findSite(state, request.params.siteId); send(request, response, state.environments.filter((environment) => environment.siteId === request.params.siteId)); });
  router.get("/sites/:siteId/collaborators", async (request, response) => { const state = await readState(context); findSite(state, request.params.siteId); send(request, response, state.collaborators.filter((collaborator) => collaborator.siteId === request.params.siteId)); });
  router.get("/sites/:siteId/findings", async (request, response) => { const state = await readState(context); findSite(state, request.params.siteId); send(request, response, state.findings); });
  router.get("/sites/:siteId/releases", async (request, response) => { const state = await readState(context); findSite(state, request.params.siteId); send(request, response, state.releases.filter((release) => release.siteId === request.params.siteId)); });
  router.get("/sites/:siteId/health-events", async (request, response) => { const state = await readState(context); findSite(state, request.params.siteId); const releaseIds = new Set(state.releases.filter((release) => release.siteId === request.params.siteId).map((release) => release.id)); send(request, response, state.healthEvents.filter((event) => releaseIds.has(event.releaseId))); });
  router.get("/sites/:siteId/summary", async (request, response) => { const siteId = requireSiteId(request); const state = await readState(context); const site = findSite(state, siteId); const releases = state.releases.filter((release) => release.siteId === siteId); send(request, response, { site, environments: state.environments.filter((environment) => environment.siteId === siteId), openFindings: state.findings.length, openConflicts: state.conflicts.filter((conflict) => !conflict.resolvedAt).length, releases, latestRelease: releases.at(-1) ?? null }); });
  return router;
}
