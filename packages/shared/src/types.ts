export type HealthStatus = "healthy" | "attention" | "blocked" | "unknown";

export type Severity = "info" | "low" | "medium" | "high" | "critical";

export interface ErrorEnvelope {
  code: string;
  message: string;
  retryable: boolean;
  requestId?: string;
  details?: Readonly<Record<string, string>>;
}

export type Result<T, E extends ErrorEnvelope = ErrorEnvelope> =
  | { ok: true; value: T }
  | { ok: false; error: E };

export interface CursorPage<T> {
  items: readonly T[];
  nextCursor: string | null;
  total: number;
}

export interface PageRequest {
  cursor?: string;
  limit: number;
}

export interface StatusSummary {
  status: HealthStatus;
  label: string;
  explanation: string;
}

export function ok<T>(value: T): Result<T> {
  return { ok: true, value };
}

export function fail(error: ErrorEnvelope): Result<never> {
  return { ok: false, error };
}

export function statusSummary(status: HealthStatus): StatusSummary {
  const summaries: Record<HealthStatus, StatusSummary> = {
    healthy: { status, label: "Healthy", explanation: "Checks are passing." },
    attention: { status, label: "Needs attention", explanation: "A review is recommended." },
    blocked: { status, label: "Blocked", explanation: "The next action cannot proceed safely." },
    unknown: { status, label: "Unknown", explanation: "There is not enough evidence yet." },
  };

  return summaries[status];
}
