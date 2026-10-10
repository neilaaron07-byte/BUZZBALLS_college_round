import type { Severity } from "./types";

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogContext {
  requestId?: string;
  actorId?: string;
  siteId?: string;
  releaseId?: string;
  severity?: Severity;
  [key: string]: string | Severity | undefined;
}

export interface LogRecord {
  timestamp: string;
  level: LogLevel;
  event: string;
  context: LogContext;
}

export type LogSink = (record: LogRecord) => void;

export interface Logger {
  child(context: LogContext): Logger;
  debug(event: string, context?: LogContext): void;
  info(event: string, context?: LogContext): void;
  warn(event: string, context?: LogContext): void;
  error(event: string, context?: LogContext): void;
}

function mergeContext(base: LogContext, next: LogContext | undefined): LogContext {
  return { ...base, ...next };
}

export function createLogger(sink: LogSink, base: LogContext = {}): Logger {
  const write = (level: LogLevel, event: string, context?: LogContext): void => {
    sink({
      timestamp: new Date().toISOString(),
      level,
      event,
      context: mergeContext(base, context),
    });
  };

  return {
    child: (context) => createLogger(sink, mergeContext(base, context)),
    debug: (event, context) => write("debug", event, context),
    info: (event, context) => write("info", event, context),
    warn: (event, context) => write("warn", event, context),
    error: (event, context) => write("error", event, context),
  };
}

export const jsonLogSink: LogSink = (record) => {
  process.stdout.write(`${JSON.stringify(record)}\n`);
};
