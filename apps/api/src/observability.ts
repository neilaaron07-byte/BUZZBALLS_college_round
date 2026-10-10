export interface TraceSpan {
  id: string;
  name: string;
  startedAt: number;
  finishedAt: number | null;
  attributes: Record<string, string | number | boolean>;
  status: "running" | "ok" | "error";
}

export interface TraceRecorder {
  readonly spans: readonly TraceSpan[];
  start(name: string, attributes?: Record<string, string | number | boolean>): TraceSpan;
  finish(spanId: string, status: "ok" | "error", attributes?: Record<string, string | number | boolean>): TraceSpan | null;
}

export class MemoryTraceRecorder implements TraceRecorder {
  private values: TraceSpan[] = [];
  get spans(): readonly TraceSpan[] { return this.values; }
  start(name: string, attributes: Record<string, string | number | boolean> = {}): TraceSpan {
    const span: TraceSpan = { id: `span_${Date.now()}_${this.values.length}`, name, startedAt: Date.now(), finishedAt: null, attributes: { ...attributes }, status: "running" };
    this.values = [...this.values, span];
    return span;
  }
  finish(spanId: string, status: "ok" | "error", attributes: Record<string, string | number | boolean> = {}): TraceSpan | null {
    const span = this.values.find((candidate) => candidate.id === spanId);
    if (!span) return null;
    const finished = { ...span, finishedAt: Date.now(), status, attributes: { ...span.attributes, ...attributes } } satisfies TraceSpan;
    this.values = this.values.map((candidate) => candidate.id === spanId ? finished : candidate);
    return finished;
  }
}

export function durationMs(span: TraceSpan): number | null {
  return span.finishedAt === null ? null : Math.max(0, span.finishedAt - span.startedAt);
}

export function summarizeTrace(spans: readonly TraceSpan[]): { count: number; errors: number; open: number; durationMs: number } {
  return { count: spans.length, errors: spans.filter((span) => span.status === "error").length, open: spans.filter((span) => span.status === "running").length, durationMs: spans.reduce((total, span) => total + (durationMs(span) ?? 0), 0) };
}
