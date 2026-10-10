import { Router } from "express";
import { evaluateHealth, healthEventLabel, healthWindow } from "../health-policy";
import { permissionsFor, permissionMatrix } from "../permissions";
import { patchHistory, revisionStatus } from "../patch-history";
import { createPreviewRecord, listPreviews, revokePreview } from "../preview-service";
import { send } from "../middleware";
import { findRelease, readState } from "../services";
import type { ApiContext } from "../types";

export function operationRoutes(context: ApiContext): Router {
  const router = Router();
  router.get("/patches/:patchId/history", async (request, response) => {
    const state = await readState(context);
    const history = patchHistory(state, request.params.patchId);
    if (!history) return response.status(404).json({ error: { code: "NOT_FOUND", message: "Patch history was not found.", requestId: request.header("x-request-id") ?? "req_unknown" } });
    send(request, response, { ...history, revisions: history.revisions.map((revision) => ({ ...revision, status: revisionStatus(revision, history.patch.revision.revision) })) });
  });
  router.get("/patches/:patchId/previews", async (request, response) => send(request, response, await listPreviews(context, request.params.patchId)));
  router.post("/patches/:patchId/private-preview", async (request, response) => send(request, response, await createPreviewRecord(context, request.params.patchId, typeof request.body?.ttlMinutes === "number" ? request.body.ttlMinutes : 30, typeof request.body?.ownerId === "string" ? request.body.ownerId : "usr_maya_singh"), 201));
  router.get("/previews", async (request, response) => send(request, response, await listPreviews(context)));
  router.post("/previews/:previewId/revoke", async (request, response) => send(request, response, await revokePreview(context, request.params.previewId)));
  router.get("/releases/:releaseId/health-decision", async (request, response) => { const state = await readState(context); const release = findRelease(state, request.params.releaseId); const decision = evaluateHealth(state, release.id); send(request, response, { ...decision, recentEvents: healthWindow(state.healthEvents.filter((event) => event.releaseId === release.id), 24).map((event) => ({ ...event, label: healthEventLabel(event) })) }); });
  router.get("/permissions", (request, response) => send(request, response, permissionMatrix()));
  router.get("/permissions/:role", (request, response) => { const role = request.params.role as Parameters<typeof permissionsFor>[0]; if (!["owner", "editor", "reviewer", "viewer"].includes(role)) return response.status(400).json({ error: { code: "INVALID_ROLE", message: "Unknown PATCHWORK role.", requestId: request.header("x-request-id") ?? "req_unknown" } }); send(request, response, { role, permissions: permissionsFor(role) }); });
  return router;
}
