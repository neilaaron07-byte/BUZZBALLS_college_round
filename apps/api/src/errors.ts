import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import type { ErrorEnvelope, RequestWithId } from "./types";

export class ApiError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(statusCode: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export function notFound(resource: string, id: string): ApiError {
  return new ApiError(404, "NOT_FOUND", `${resource} ${id} was not found.`);
}

export function getRequestId(request: Request): string {
  return (request as RequestWithId).requestId ?? "req_unknown";
}

export function errorHandler(error: unknown, request: Request, response: Response, next: NextFunction): void {
  void next;
  const requestId = getRequestId(request);
  const tooLarge = typeof error === "object" && error !== null && "type" in error && error.type === "entity.too.large";
  const apiError = error instanceof ApiError ? error : tooLarge ? new ApiError(413, "PAYLOAD_TOO_LARGE", "Request payload exceeds the 128kb safety limit.") : error instanceof SyntaxError ? new ApiError(400, "INVALID_JSON", "Request body is not valid JSON.") : error instanceof ZodError ? new ApiError(400, "SCHEMA_INVALID", "Request payload failed the PATCHWORK schema.", error.issues.map((issue) => ({ path: issue.path, message: issue.message }))) : new ApiError(500, "INTERNAL_ERROR", "PATCHWORK could not complete this request safely.");
  const body: ErrorEnvelope = { error: { code: apiError.code, message: apiError.message, requestId, ...(apiError.details === undefined ? {} : { details: apiError.details }) } };
  response.status(apiError.statusCode).json(body);
}
