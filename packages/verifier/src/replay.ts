import { readFile } from "node:fs/promises";
import type { VerificationReport } from "./contracts";

export function parseVerificationReport(input: unknown): VerificationReport {
  if (!input || typeof input !== "object") throw new Error("Stored verification report must be an object.");
  const report = input as Partial<VerificationReport>;
  if (report.schemaVersion !== 1 || typeof report.id !== "string" || !Array.isArray(report.checks) || !Array.isArray(report.viewports)) throw new Error("Stored verification report is incompatible.");
  return report as VerificationReport;
}

export async function replayVerificationReport(path: string): Promise<VerificationReport> {
  return parseVerificationReport(JSON.parse(await readFile(path, "utf8")) as unknown);
}
