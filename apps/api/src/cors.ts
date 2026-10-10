import type { RequestHandler } from "express";

const localOrigins = new Set(["http://localhost:3000", "http://127.0.0.1:3000"]);

export function localCors(): RequestHandler {
  return (request, response, next) => {
    const origin = request.header("origin");
    if (origin && localOrigins.has(origin)) {
      response.setHeader("access-control-allow-origin", origin);
      response.setHeader("access-control-allow-methods", "GET,POST,PATCH,OPTIONS");
      response.setHeader("access-control-allow-headers", "content-type,accept,idempotency-key,x-request-id,x-patchwork-site");
      response.setHeader("access-control-max-age", "600");
      response.vary("Origin");
    }
    if (request.method === "OPTIONS") {
      response.status(origin && localOrigins.has(origin) ? 204 : 403).end();
      return;
    }
    next();
  };
}
