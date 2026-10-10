import { Router } from "express";
import { idempotent, send } from "../middleware";
import { findRelease, ingestHealthEvent, publishRelease, readState, releaseTransition, updateKillSwitch, updateRollout } from "../services";
import type { ApiContext } from "../types";

export function releaseRoutes(context: ApiContext): Router {
  const router = Router();
  router.get("/releases/:releaseId", async (request, response) => { const state = await readState(context); const release = findRelease(state, request.params.releaseId); const rollout = state.rollouts.find((candidate) => candidate.releaseId === release.id) ?? null; send(request, response, { release, rollout }); });
  router.post("/releases/:releaseId/publish", async (request, response) => idempotent(context, request, response, async () => ({ data: await publishRelease(context, request.params.releaseId) })));
  router.post("/releases/:releaseId/promote", async (request, response) => idempotent(context, request, response, async () => ({ data: { release: await releaseTransition(context, request.params.releaseId, "promote"), rollout: await updateRollout(context, request.params.releaseId, { canaryPercent: 100, paused: false }) } })));
  router.post("/releases/:releaseId/pause", async (request, response) => idempotent(context, request, response, async () => ({ data: { release: await releaseTransition(context, request.params.releaseId, "pause"), rollout: await updateRollout(context, request.params.releaseId, { paused: true }) } })));
  router.post("/releases/:releaseId/canary", async (request, response) => { const percent = typeof request.body?.percent === "number" ? request.body.percent : 25; send(request, response, await updateRollout(context, request.params.releaseId, { canaryPercent: percent }), 200); });
  router.post("/releases/:releaseId/kill-switch", async (request, response) => { const enabled = request.body?.enabled === true; const reason = typeof request.body?.reason === "string" ? request.body.reason : null; send(request, response, await updateKillSwitch(context, request.params.releaseId, enabled, reason)); });
  router.post("/releases/:releaseId/rollback", async (request, response) => idempotent(context, request, response, async () => ({ data: await releaseTransition(context, request.params.releaseId, "rollback") })));
  router.post("/health-events", async (request, response) => idempotent(context, request, response, async () => { const result = await ingestHealthEvent(context, request.body); return { status: result.automaticRollback ? 202 : 201, data: result }; }));
  return router;
}
