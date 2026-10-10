import { Router } from "express";
import { send, idempotent } from "../middleware";
import { getWorkspaceExport, importWorkspace, validateWorkspaceImport } from "../services";
import type { ApiContext } from "../types";

export function workspaceRoutes(context: ApiContext): Router {
  const router = Router();
  router.get("/workspace/export", async (request, response) => { const siteId = typeof request.query.siteId === "string" ? request.query.siteId : "site_shopnest"; send(request, response, await getWorkspaceExport(context, siteId)); });
  router.post("/workspace/import/validate", async (request, response) => send(request, response, await validateWorkspaceImport(request.body)));
  router.post("/workspace/import", async (request, response) => idempotent(context, request, response, async () => ({ status: 201, data: await importWorkspace(context, request.body) })));
  return router;
}
