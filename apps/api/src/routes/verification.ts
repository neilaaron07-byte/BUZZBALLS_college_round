import { Router } from "express";
import { parseVerificationReport } from "../../../../packages/verifier/src/index";
import { send } from "../middleware";
import { createPreview, readState, storeVerification } from "../services";
import type { ApiContext } from "../types";

export function verificationRoutes(context: ApiContext): Router {
  const router = Router();
  router.get("/verification-runs", async (request, response) => send(request, response, (await readState(context)).verificationReports));
  router.get("/verification-runs/:runId", async (request, response) => { const report = (await readState(context)).verificationReports.find((candidate) => candidate.id === request.params.runId); if (!report) return response.status(404).json({ error: { code: "NOT_FOUND", message: `Verification run ${request.params.runId} was not found.`, requestId: request.header("x-request-id") ?? "req_unknown" } }); send(request, response, report); });
  router.post("/verification-runs", async (request, response) => send(request, response, await storeVerification(context, request.body), 201));
  router.post("/verification-runs/replay", async (request, response) => { const report = parseVerificationReport(request.body); send(request, response, { report, replayed: true, summary: report.summary }); });
  router.post("/verification-runs/:runId/replay", async (request, response) => { const report = (await readState(context)).verificationReports.find((candidate) => candidate.id === request.params.runId); if (!report) return response.status(404).json({ error: { code: "NOT_FOUND", message: `Verification run ${request.params.runId} was not found.`, requestId: request.header("x-request-id") ?? "req_unknown" } }); send(request, response, { report, replayed: true, summary: report.summary }); });
  router.post("/previews/:patchId", async (request, response) => send(request, response, await createPreview(context, request.params.patchId, typeof request.body?.ttlMinutes === "number" ? request.body.ttlMinutes : 30), 201));
  return router;
}
