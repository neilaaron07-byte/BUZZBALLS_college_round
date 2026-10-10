import type { Request } from "express";
import { normalizeRequestId } from "./security";

export interface RequestAuditContext {
  requestId: string;
  actorId: string | null;
  siteId: string | null;
  method: string;
  path: string;
  userAgent: string | null;
  idempotencyKey: string | null;
  startedAt: number;
}

export function requestAuditContext(request: Request, startedAt = Date.now()): RequestAuditContext {
  return { requestId: normalizeRequestId(request.header("x-request-id") ?? undefined), actorId: request.header("x-patchwork-actor") ?? null, siteId: typeof request.params.siteId === "string" ? request.params.siteId : request.header("x-patchwork-site") ?? null, method: request.method, path: request.path, userAgent: request.header("user-agent") ?? null, idempotencyKey: request.header("idempotency-key") ?? null, startedAt };
}

export function auditDuration(context: RequestAuditContext, now = Date.now()): number {
  return Math.max(0, now - context.startedAt);
}

export function auditLine(context: RequestAuditContext, status: number, now = Date.now()): Readonly<Record<string, string | number | null>> {
  return { requestId: context.requestId, actorId: context.actorId, siteId: context.siteId, method: context.method, path: context.path, status, durationMs: auditDuration(context, now), idempotencyKey: context.idempotencyKey };
}
