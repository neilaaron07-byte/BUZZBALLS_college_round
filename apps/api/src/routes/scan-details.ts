import { Router } from "express";
import { compareFindings, detectorCoverage, scanRunStatus, summarizeFindings } from "../scan-analysis";
import { send } from "../middleware";
import { readState } from "../services";
import type { ApiContext } from "../types";

export function scanDetailRoutes(context: ApiContext): Router {
  const router = Router();
  router.get("/scans/:scanId/summary", async (request, response) => { const state = await readState(context); const run = state.scanRuns.find((candidate) => candidate.id === request.params.scanId); if (!run) return response.status(404).json({ error: { code: "NOT_FOUND", message: "Scan run was not found.", requestId: request.header("x-request-id") ?? "req_unknown" } }); const findings = state.findings.filter((finding) => run.findingIds.includes(finding.id)); send(request, response, { run, summary: summarizeFindings(findings), status: scanRunStatus(run, findings), coverage: detectorCoverage(findings) }); });
  router.get("/scans/:scanId/compare/:otherScanId", async (request, response) => { const state = await readState(context); const left = state.scanRuns.find((candidate) => candidate.id === request.params.scanId); const right = state.scanRuns.find((candidate) => candidate.id === request.params.otherScanId); if (!left || !right) return response.status(404).json({ error: { code: "NOT_FOUND", message: "One of the scan runs was not found.", requestId: request.header("x-request-id") ?? "req_unknown" } }); send(request, response, { before: left.id, after: right.id, comparison: compareFindings(state.findings.filter((finding) => left.findingIds.includes(finding.id)), state.findings.filter((finding) => right.findingIds.includes(finding.id))) }); });
  router.get("/scan-detectors", async (request, response) => { const state = await readState(context); send(request, response, { coverage: detectorCoverage(state.findings), detectorCount: 6 }); });
  return router;
}
