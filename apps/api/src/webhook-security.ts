import { createHmac, timingSafeEqual } from "node:crypto";

export interface WebhookVerification {
  valid: boolean;
  reason: "valid" | "missing_signature" | "invalid_signature" | "invalid_format";
}

export function signatureFor(body: string, secret: string): string {
  return `sha256=${createHmac("sha256", secret).update(body, "utf8").digest("hex")}`;
}

export function verifySignature(body: string, signature: string | undefined, secret: string | undefined): WebhookVerification {
  if (!signature || !secret) return { valid: false, reason: "missing_signature" };
  if (!/^sha256=[a-f0-9]{64}$/.test(signature)) return { valid: false, reason: "invalid_format" };
  const expected = Buffer.from(signatureFor(body, secret));
  const supplied = Buffer.from(signature);
  return { valid: expected.length === supplied.length && timingSafeEqual(expected, supplied), reason: expected.length === supplied.length && timingSafeEqual(expected, supplied) ? "valid" : "invalid_signature" };
}

export function webhookHeaders(secret: string, body: string): Readonly<Record<string, string>> {
  return { "x-hub-signature-256": signatureFor(body, secret), "content-type": "application/json" };
}

export function isReplaySafe(deliveryId: string | undefined, seen: ReadonlySet<string>): boolean {
  return Boolean(deliveryId && deliveryId.length <= 120 && !seen.has(deliveryId));
}
