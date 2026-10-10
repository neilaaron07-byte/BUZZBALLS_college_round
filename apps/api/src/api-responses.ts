import type { Response } from "express";

export interface PaginationLinks {
  self: string;
  next: string | null;
}

export interface CollectionResponse<T> {
  items: readonly T[];
  page: { limit: number; total: number; nextCursor: string | null };
  links: PaginationLinks;
}

export function collectionResponse<T>(items: readonly T[], limit: number, total: number, nextCursor: string | null, self: string): CollectionResponse<T> {
  return { items, page: { limit, total, nextCursor }, links: { self, next: nextCursor ? `${self}${self.includes("?") ? "&" : "?"}cursor=${encodeURIComponent(nextCursor)}` : null } };
}

export function setDownload(response: Response, filename: string, contentType: string): void {
  response.setHeader("content-disposition", `attachment; filename=${filename.replace(/[^a-zA-Z0-9._-]/g, "_")}`);
  response.setHeader("content-type", contentType);
  response.setHeader("cache-control", "no-store");
}

export function responseMeta(requestId: string, generatedAt = new Date().toISOString()): { requestId: string; generatedAt: string } {
  return { requestId, generatedAt };
}

export function emptyState(title: string, message: string, action: string): { title: string; message: string; action: string } {
  return { title, message, action };
}

export function errorHint(code: string): string {
  const hints: Readonly<Record<string, string>> = { NOT_FOUND: "Check the id and refresh the workspace.", SCHEMA_INVALID: "Review the highlighted fields and try again.", RELEASE_POLICY_BLOCKED: "Resolve the failed policy checks before promotion.", RATE_LIMITED: "Wait briefly and retry the request." };
  return hints[code] ?? "Review the evidence and try again.";
}
