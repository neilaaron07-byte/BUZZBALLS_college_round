import type { Patch } from "./patches";

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortValue);
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).sort(([left], [right]) => left.localeCompare(right));
    return Object.fromEntries(entries.map(([key, entry]) => [key, sortValue(entry)]));
  }
  return value;
}

export function canonicalJson(value: unknown): string {
  return JSON.stringify(sortValue(value));
}

export function normalizePatch(patch: Patch): Patch {
  return {
    ...patch,
    title: patch.title.trim(),
    description: patch.description.trim(),
    operations: [...patch.operations].sort((left, right) => left.id.localeCompare(right.id)),
    dependencies: [...new Set(patch.dependencies)].sort(),
    reviewers: [...patch.reviewers].sort((left, right) => left.id.localeCompare(right.id)),
    tags: [...new Set(patch.tags.map((tag) => tag.trim().toLowerCase()))].sort(),
  };
}

export async function sha256(value: string): Promise<`sha256-${string}`> {
  const digest = await globalThis.crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  const hex = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `sha256-${hex}`;
}

export function patchContentHash(patch: Patch): Promise<`sha256-${string}`> {
  return sha256(canonicalJson(normalizePatch(patch)));
}
