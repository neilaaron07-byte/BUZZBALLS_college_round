import { Router } from "express";
import { idempotent, requireSiteId, send } from "../middleware";
import { addReview, createPatch, createPreview, createRevision, findPatch, readState } from "../services";
import type { ApiContext } from "../types";

export function patchRoutes(context: ApiContext): Router {
  const router = Router();
  router.get("/sites/:siteId/patches", async (request, response) => { const state = await readState(context); const siteId = requireSiteId(request); send(request, response, state.patches.filter((patch) => patch.identity.siteId === siteId)); });
  router.post("/patches", async (request, response) => idempotent(context, request, response, async () => ({ status: 201, data: await createPatch(context, request.body) })));
  router.get("/patches/:patchId", async (request, response) => { const state = await readState(context); send(request, response, findPatch(state, request.params.patchId)); });
  router.get("/patches/:patchId/revisions", async (request, response) => { const state = await readState(context); findPatch(state, request.params.patchId); send(request, response, state.patchRevisions.filter((revision) => revision.patchId === request.params.patchId)); });
  router.post("/patches/:patchId/revisions", async (request, response) => idempotent(context, request, response, async () => ({ status: 201, data: await createRevision(context, request.params.patchId, request.body) })));
  router.get("/patches/:patchId/reviews", async (request, response) => { const state = await readState(context); findPatch(state, request.params.patchId); send(request, response, state.reviews.filter((review) => review.patchId === request.params.patchId)); });
  router.post("/patches/:patchId/reviews", async (request, response) => idempotent(context, request, response, async () => ({ status: 201, data: await addReview(context, request.params.patchId, request.body) })));
  router.post("/patches/:patchId/approve", async (request, response) => idempotent(context, request, response, async () => ({ status: 201, data: await addReview(context, request.params.patchId, { ...request.body, decision: "approved" }) })));
  router.post("/patches/:patchId/preview", async (request, response) => { const ttl = typeof request.body?.ttlMinutes === "number" ? request.body.ttlMinutes : 30; send(request, response, await createPreview(context, request.params.patchId, ttl), 201); });
  return router;
}
