import { Router } from "express";
import { send, requireSiteId } from "../middleware";
import { readState, updateCollaborator } from "../services";
import type { ApiContext } from "../types";

export function collaboratorRoutes(context: ApiContext): Router {
  const router = Router();
  router.get("/sites/:siteId/collaborators", async (request, response) => { const state = await readState(context); const siteId = requireSiteId(request); send(request, response, state.collaborators.filter((collaborator) => collaborator.siteId === siteId)); });
  router.patch("/sites/:siteId/collaborators/:authorId", async (request, response) => { const result = await updateCollaborator(context, request.params.siteId, { ...request.body, authorId: request.params.authorId }); send(request, response, result); });
  router.get("/reviews", async (request, response) => send(request, response, (await readState(context)).reviews));
  return router;
}
