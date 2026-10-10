import { timingSafeEqual } from "node:crypto";

export interface SecurityCheck {
  id: string;
  status: "passed" | "warning" | "failed";
  explanation: string;
}

export function sameOrigin(left: string, right: string): boolean {
  try { return new URL(left).origin === new URL(right).origin; } catch { return false; }
}

export function normalizeRequestId(value: string | undefined): string {
  const normalized = value?.trim() ?? "";
  return normalized.length > 0 && normalized.length <= 80 && /^[a-zA-Z0-9._:-]+$/.test(normalized) ? normalized : `req_${Date.now().toString(36)}`;
}

export function safeCompare(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  if (leftBuffer.length !== rightBuffer.length) return false;
  return timingSafeEqual(leftBuffer, rightBuffer);
}

export function requestSecurityChecks(headers: Readonly<Record<string, string | undefined>>): readonly SecurityCheck[] {
  return [
    { id: "request-id", status: normalizeRequestId(headers["x-request-id"]).startsWith("req_") || Boolean(headers["x-request-id"]?.trim()) ? "passed" : "failed", explanation: "Request correlation is available for audit and support." },
    { id: "idempotency", status: headers["idempotency-key"] ? "passed" : "warning", explanation: headers["idempotency-key"] ? "The write request has an idempotency key." : "Critical writes should include an idempotency key." },
    { id: "origin", status: headers.origin ? "passed" : "warning", explanation: headers.origin ? "The caller supplied an origin header." : "No browser origin was supplied by this client." },
  ];
}

export function redactToken(value: string | undefined): string {
  if (!value) return "";
  return value.length <= 8 ? "••••" : `${value.slice(0, 3)}••••${value.slice(-3)}`;
}
