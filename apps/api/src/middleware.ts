import { randomUUID } from "node:crypto";
import type { NextFunction, Request, RequestHandler, Response } from "express";
import type { ApiContext, ApiEnvelope, RequestWithId } from "./types";
import { ApiError, getRequestId } from "./errors";

export function requestContext(context: ApiContext): RequestHandler {
  return (request: Request, response: Response, next: NextFunction) => {
    const enriched = request as RequestWithId;
    enriched.requestId = request.header("x-request-id")?.slice(0, 80) || `req_${randomUUID()}`;
    enriched.startedAt = Date.now();
    response.setHeader("x-request-id", enriched.requestId);
    response.on("finish", () => {
      const durationMs = Date.now() - (enriched.startedAt ?? Date.now());
      if (response.statusCode >= 500) context.volatileMetrics.errors += 1;
      console.log(JSON.stringify({ level: response.statusCode >= 500 ? "error" : "info", event: "http_request", requestId: enriched.requestId, method: request.method, path: request.path, status: response.statusCode, durationMs }));
    });
    context.volatileMetrics.requests += 1;
    next();
  };
}

export function rateLimit(context: ApiContext, windowMs = 60_000, maxRequests = 120): RequestHandler {
  const windows = new Map<string, { startedAt: number; count: number }>();
  return (request, _response, next) => {
    const key = request.ip || request.socket.remoteAddress || "unknown";
    const now = Date.now();
    const current = windows.get(key);
    if (!current || now - current.startedAt >= windowMs) windows.set(key, { startedAt: now, count: 1 });
    else if (current.count >= maxRequests) return next(new ApiError(429, "RATE_LIMITED", "Too many requests. Try again shortly."));
    else current.count += 1;
    next();
  };
}

export function requireSiteId(request: Request): string {
  const siteId = typeof request.params.siteId === "string" ? request.params.siteId : typeof request.body?.siteId === "string" ? request.body.siteId : request.header("x-patchwork-site");
  if (!siteId) throw new ApiError(400, "SITE_REQUIRED", "A siteId is required for this action.");
  return siteId;
}

export function send<T>(request: Request, response: Response, data: T, status = 200): void {
  const body: ApiEnvelope<T> = { data, requestId: getRequestId(request) };
  response.status(status).json(body);
}

export async function idempotent<T>(context: ApiContext, request: Request, response: Response, handler: () => Promise<{ status?: number; data: T }>): Promise<void> {
  const key = request.header("idempotency-key")?.trim();
  if (!key) {
    const result = await handler();
    send(request, response, result.data, result.status ?? 200);
    return;
  }
  if (key.length > 160) throw new ApiError(400, "INVALID_IDEMPOTENCY_KEY", "Idempotency-Key must be 160 characters or fewer.");
  const cached = context.requestCache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    context.volatileMetrics.idempotentReplays += 1;
    send(request, response, cached.body as T, cached.status);
    return;
  }
  const result = await handler();
  context.requestCache.set(key, { status: result.status ?? 200, body: result.data, expiresAt: Date.now() + context.idempotencyTtlMs });
  send(request, response, result.data, result.status ?? 200);
}
