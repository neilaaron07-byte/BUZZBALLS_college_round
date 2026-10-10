import { Router } from "express";
import { parseLimit } from "../contracts";
import { send, requireSiteId } from "../middleware";
import { filterByQuery, paginate } from "../query";
import { findSite, readState, runScan } from "../services";
import { summarizeFindings } from "../scan-analysis";
import type { ApiContext } from "../types";

export function scanRoutes(context: ApiContext): Router {
  const router = Router();
  router.get("/sites/:siteId/scans", async (request, response) => {
    const state = await readState(context);
    const siteId = requireSiteId(request);
    findSite(state, siteId);
    const filtered = filterByQuery(state.scanRuns.filter((scan) => scan.siteId === siteId), typeof request.query.q === "string" ? request.query.q : undefined, ["id", "pageUrl", "summary", "status"]);
    const page = paginate(filtered, { limit: parseLimit(request.query.limit), cursor: typeof request.query.cursor === "string" ? request.query.cursor : undefined, direction: request.query.direction === "asc" ? "asc" : "desc" }, (scan) => scan.id);
    send(request, response, page);
  });
  router.post("/scans", async (request, response) => send(request, response, await runScan(context, request.body), 201));
  router.get("/scans/:scanId", async (request, response) => { const scan = (await readState(context)).scanRuns.find((candidate) => candidate.id === request.params.scanId); if (!scan) return response.status(404).json({ error: { code: "NOT_FOUND", message: "Scan run was not found.", requestId: request.header("x-request-id") ?? "req_unknown" } }); send(request, response, scan); });
  router.get("/scans/:scanId/findings", async (request, response) => { const state = await readState(context); const scan = state.scanRuns.find((candidate) => candidate.id === request.params.scanId); if (!scan) return response.status(404).json({ error: { code: "NOT_FOUND", message: "Scan run was not found.", requestId: request.header("x-request-id") ?? "req_unknown" } }); send(request, response, state.findings.filter((finding) => scan.findingIds.includes(finding.id))); });
  router.get("/scans/coverage", async (request, response) => { const state = await readState(context); send(request, response, { scans: state.scanRuns.length, completed: state.scanRuns.filter((scan) => scan.status === "completed").length, findings: summarizeFindings(state.findings), supportedDetectors: 6 }); });
  return router;
}
