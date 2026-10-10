import { Router } from "express";
import { asyncRoute } from "../route-helpers";
import { getLiveScanJob, liveScanSse, serializeLiveScanJob, startLiveScan, subscribeLiveScan } from "../live-site";
import { idempotent, send } from "../middleware";
import { findSite, createPatch, readState, releaseTransition, updateKillSwitch } from "../services";
import { livePatchProposalRequestSchema, runtimeHandshakeRequestSchema, runtimeReleaseActionSchema } from "../contracts";
import { ApiError } from "../errors";
import type { ApiContext } from "../types";

function routeParam(value: string | string[] | undefined): string {
  return typeof value === "string" ? value : "";
}

interface RuntimeShipResponse {
  boundary: "sdk_runtime";
  action: string;
  result: unknown;
}

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
  router.post("/live-sites/:siteId/patches/proposals", asyncRoute(async (request, response) => {
    const siteId = routeParam(request.params.siteId);
    const input = livePatchProposalRequestSchema.parse({ ...request.body, siteId });
    if (input.operations.length !== input.inverseOperations.length || input.operations.some((operation, index) => operation.target.fingerprint !== input.inverseOperations[index]?.target.fingerprint)) throw new ApiError(400, "INVERSE_REQUIRED", "Every live proposal operation must carry a matching inverse operation for the same target.");
    const state = await readState(context);
    findSite(state, siteId);
    const patch = await createPatch(context, { id: input.id, siteId: input.siteId, authorId: input.authorId, title: input.title, description: input.description, message: input.message, targetFingerprint: input.targetFingerprint, operations: input.operations, dependencies: input.dependencies, reviewers: input.reviewers, tags: input.tags });
    send(request, response, { patch, inverseOperations: input.inverseOperations, source: input.source, status: "review", runtimeRequired: true }, 201);
  }));
  router.get("/sites/:siteId/runtime", asyncRoute(async (request, response) => {
    const siteId = routeParam(request.params.siteId);
    const state = await readState(context);
    findSite(state, siteId);
    const connection = context.runtimeConnections.get(siteId) ?? null;
    send(request, response, connection ?? { siteId, status: "not_installed", origin: null, sdkVersion: null, manifestHash: null, connectedAt: null, lastSeenAt: null, nextAction: "Install the PATCHWORK SDK on the target origin before publishing a live patch." });
  }));
  router.post("/sites/:siteId/runtime/handshake", asyncRoute(async (request, response) => {
    const siteId = routeParam(request.params.siteId);
    const input = runtimeHandshakeRequestSchema.parse(request.body);
    const state = await readState(context);
    findSite(state, siteId);
    const now = new Date().toISOString();
    const connection = { siteId, origin: new URL(input.origin).origin, sdkVersion: input.sdkVersion, manifestHash: input.manifestHash, status: "connected" as const, connectedAt: now, lastSeenAt: now };
    context.runtimeConnections.set(siteId, connection);
    send(request, response, connection, 200);
  }));
  router.post("/live-sites/:siteId/releases/:releaseId/ship", asyncRoute(async (request, response) => {
    const siteId = routeParam(request.params.siteId);
    const input = runtimeReleaseActionSchema.parse({ ...request.body, releaseId: request.params.releaseId });
    await idempotent<RuntimeShipResponse>(context, request, response, async (): Promise<{ data: RuntimeShipResponse }> => {
      const connection = context.runtimeConnections.get(siteId);
      if (!connection || connection.status !== "connected") throw new ApiError(409, "RUNTIME_NOT_CONNECTED", "Publishing a live patch requires a connected PATCHWORK SDK runtime.");
      if (input.action === "kill_switch") return { data: { boundary: "sdk_runtime", action: input.action, result: await updateKillSwitch(context, input.releaseId, true, input.reason) } };
      const result = await releaseTransition(context, input.releaseId, input.action === "promote" ? "promote" : input.action);
      return { data: { boundary: "sdk_runtime", action: input.action, result } };
    });
  }));
  return router;
}
