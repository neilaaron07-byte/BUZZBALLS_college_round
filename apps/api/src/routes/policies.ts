import { Router } from "express";
import { send } from "../middleware";
import { getReleasePolicy } from "../services";
import type { ApiContext } from "../types";

export function policyRoutes(context: ApiContext): Router {
  const router = Router();
  router.get("/releases/:releaseId/policy", async (request, response) => send(request, response, await getReleasePolicy(context, request.params.releaseId)));
  return router;
}
