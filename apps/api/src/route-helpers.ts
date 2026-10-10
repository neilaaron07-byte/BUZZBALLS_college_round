import type { NextFunction, Request, RequestHandler, Response } from "express";
import { ApiError } from "./errors";

export function asyncRoute(handler: (request: Request, response: Response, next: NextFunction) => Promise<void>): RequestHandler {
  return (request, response, next) => { void handler(request, response, next).catch(next); };
}

export function parsePositiveInteger(value: unknown, name: string, fallback: number): number {
  if (value === undefined) return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) throw new ApiError(400, "INVALID_QUERY", `${name} must be a positive integer.`);
  return parsed;
}

export function parsePercent(value: unknown, fallback = 25): number {
  const parsed = value === undefined ? fallback : Number(value);
  if (!Number.isInteger(parsed) || parsed < 0 || parsed > 100) throw new ApiError(400, "INVALID_PERCENT", "Percentage must be an integer from 0 to 100.");
  return parsed;
}

export function parseDateRange(request: Request): { from: Date | null; to: Date | null } {
  const from = typeof request.query.from === "string" ? new Date(request.query.from) : null;
  const to = typeof request.query.to === "string" ? new Date(request.query.to) : null;
  if (from && Number.isNaN(from.getTime())) throw new ApiError(400, "INVALID_DATE", "The from date is not valid.");
  if (to && Number.isNaN(to.getTime())) throw new ApiError(400, "INVALID_DATE", "The to date is not valid.");
  if (from && to && from > to) throw new ApiError(400, "INVALID_DATE_RANGE", "The from date must be before the to date.");
  return { from, to };
}

export function withCacheHeader(response: Response, seconds: number): void {
  response.setHeader("cache-control", `private, max-age=${Math.max(0, Math.floor(seconds))}`);
}
