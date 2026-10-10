export function jsonSize(value: unknown): number {
  return new TextEncoder().encode(JSON.stringify(value)).byteLength;
}

export function cloneJson<T>(value: T): T {
  return structuredClone(value);
}

export function stableRecord(value: Readonly<Record<string, unknown>>): Readonly<Record<string, unknown>> {
  return Object.fromEntries(Object.entries(value).sort(([left], [right]) => left.localeCompare(right)));
}

export function redactFields<T extends Record<string, unknown>>(value: T, fields: readonly string[]): Omit<T, string> & Record<string, unknown> {
  const clone = { ...value } as Record<string, unknown>;
  for (const field of fields) if (field in clone) clone[field] = "[redacted]";
  return clone as Omit<T, string> & Record<string, unknown>;
}

export function safeJson<T>(value: T, maxBytes = 131_072): T {
  if (jsonSize(value) > maxBytes) throw new Error(`Serialized response exceeds ${maxBytes} bytes.`);
  return value;
}

export function parseJson<T>(value: string, guard: (input: unknown) => input is T): T {
  const parsed: unknown = JSON.parse(value);
  if (!guard(parsed)) throw new Error("Serialized JSON failed its runtime guard.");
  return parsed;
}

export function isoOrNull(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}
