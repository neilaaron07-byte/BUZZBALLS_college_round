import { ApiError } from "./errors";

export interface Page<T> {
  items: readonly T[];
  nextCursor: string | null;
  limit: number;
  total: number;
}

export interface PageOptions {
  cursor?: string;
  limit: number;
  sort?: string;
  direction: "asc" | "desc";
}

export function paginate<T>(items: readonly T[], options: PageOptions, getKey: (item: T) => string): Page<T> {
  const cursorIndex = options.cursor ? items.findIndex((item) => getKey(item) === options.cursor) : -1;
  const start = cursorIndex >= 0 ? cursorIndex + 1 : 0;
  const selected = items.slice(start, start + options.limit);
  const nextCursor = start + options.limit < items.length ? getKey(selected.at(-1) as T) : null;
  return { items: selected, nextCursor, limit: options.limit, total: items.length };
}

export function sortBy<T>(items: readonly T[], key: keyof T, direction: "asc" | "desc"): T[] {
  return [...items].sort((left, right) => {
    const leftValue = String(left[key] ?? "");
    const rightValue = String(right[key] ?? "");
    const result = leftValue.localeCompare(rightValue);
    return direction === "asc" ? result : -result;
  });
}

export function filterByQuery<T>(items: readonly T[], query: string | undefined, fields: readonly (keyof T)[]): T[] {
  const normalized = query?.trim().toLocaleLowerCase("en-US");
  if (!normalized) return [...items];
  return items.filter((item) => fields.some((field) => String(item[field] ?? "").toLocaleLowerCase("en-US").includes(normalized)));
}

export function requireCursor(cursor: string | undefined, knownKeys: ReadonlySet<string>): void {
  if (cursor && !knownKeys.has(cursor)) throw new ApiError(400, "INVALID_CURSOR", "The requested page cursor is no longer valid.");
}
