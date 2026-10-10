import { z } from "zod";

export const uuidLikeSchema = z.string().min(4).max(128).regex(/^[a-zA-Z0-9._:-]+$/);

export function parseRouteId(value: unknown, name = "id"): string {
  const parsed = uuidLikeSchema.safeParse(value);
  if (!parsed.success) throw new Error(`${name} is not a valid PATCHWORK identifier.`);
  return parsed.data;
}

export function parseBoolean(value: unknown, fallback = false): boolean {
  if (value === undefined) return fallback;
  if (value === true || value === "true" || value === "1") return true;
  if (value === false || value === "false" || value === "0") return false;
  throw new Error("Boolean query value is invalid.");
}

export function parseEnum<T extends readonly string[]>(value: unknown, allowed: T, fallback: T[number]): T[number] {
  if (value === undefined) return fallback;
  if (typeof value === "string" && (allowed as readonly string[]).includes(value)) return value as T[number];
  throw new Error(`Value must be one of: ${allowed.join(", ")}.`);
}

export function optionalString(value: unknown, maxLength = 500): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "string" || value.length > maxLength) throw new Error("String query value is invalid.");
  return value;
}
