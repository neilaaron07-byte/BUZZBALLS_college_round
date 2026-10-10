import { Router } from "express";
import { verifyChain, type AuditEntry } from "../../../../packages/core/src/index";
import { send } from "../middleware";
import { readState } from "../services";
import type { ApiContext } from "../types";
import { auditCsv } from "../audit-report";

export function auditRoutes(context: ApiContext): Router {
  const router = Router();
  router.get("/audit/export", async (request, response) => { const state = await readState(context); response.setHeader("content-disposition", "attachment; filename=patchwork-audit.json"); send(request, response, { exportedAt: new Date().toISOString(), entries: state.auditEntries, chain: await verifyChain(state.auditEntries) }); });
  router.get("/audit/export.csv", async (request, response) => { const state = await readState(context); response.setHeader("content-type", "text/csv; charset=utf-8"); response.setHeader("content-disposition", "attachment; filename=patchwork-audit.csv"); response.send(auditCsv(state.auditEntries)); });
  router.get("/audit/verify", async (request, response) => { const state = await readState(context); send(request, response, await verifyChain(state.auditEntries)); });
  router.post("/audit/tamper-test", async (request, response) => { const state = await readState(context); const first = state.auditEntries[0]; if (!first) return send(request, response, { valid: true, reason: "No audit entries are available to tamper-test." }); const tampered: AuditEntry[] = [{ ...first, details: { ...first.details, message: "Evidence changed after capture." } }, ...state.auditEntries.slice(1)]; const result = await verifyChain(tampered); send(request, response, { ...result, tamperDetected: result.valid === false }); });
  return router;
}
