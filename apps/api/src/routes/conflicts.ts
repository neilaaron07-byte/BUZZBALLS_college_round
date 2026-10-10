import { Router } from "express";
import { send } from "../middleware";
import { readState, resolveConflict } from "../services";
import type { ApiContext } from "../types";

export function conflictRoutes(context: ApiContext): Router {
  const router = Router();
  router.get("/conflicts", async (request, response) => send(request, response, (await readState(context)).conflicts));
  router.get("/conflicts/:conflictId", async (request, response) => { const conflict = (await readState(context)).conflicts.find((candidate) => candidate.id === request.params.conflictId); if (!conflict) return response.status(404).json({ error: { code: "NOT_FOUND", message: "Conflict was not found.", requestId: request.header("x-request-id") ?? "req_unknown" } }); send(request, response, conflict); });
  router.post("/conflicts/:conflictId/resolve", async (request, response) => send(request, response, await resolveConflict(context, request.params.conflictId, request.body)));
  return router;
}
