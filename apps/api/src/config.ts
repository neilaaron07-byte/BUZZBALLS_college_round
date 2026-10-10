import { z } from "zod";

export const apiConfigSchema = z.object({
  port: z.number().int().min(1).max(65_535),
  host: z.string().min(1).max(120),
  dataFile: z.string().min(1).max(500),
  payloadLimit: z.string().regex(/^\d+(?:kb|mb)$/i),
  rateLimitPerMinute: z.number().int().min(1).max(10_000),
  idempotencyTtlMs: z.number().int().min(1_000).max(86_400_000),
  environment: z.enum(["development", "test", "production"]),
}).strict();

export type ApiConfig = z.infer<typeof apiConfigSchema>;

export function readApiConfig(environment = process.env.NODE_ENV === "production" ? "production" : "development"): ApiConfig {
  return apiConfigSchema.parse({ port: Number(process.env.PATCHWORK_API_PORT ?? 8787), host: process.env.PATCHWORK_API_HOST ?? "127.0.0.1", dataFile: process.env.PATCHWORK_DATA_FILE ?? `${process.cwd()}/.patchwork/state.json`, payloadLimit: process.env.PATCHWORK_PAYLOAD_LIMIT ?? "128kb", rateLimitPerMinute: Number(process.env.PATCHWORK_RATE_LIMIT ?? 120), idempotencyTtlMs: Number(process.env.PATCHWORK_IDEMPOTENCY_TTL_MS ?? 600_000), environment });
}

export function redactedConfig(config: ApiConfig): Omit<ApiConfig, "dataFile"> & { dataFile: string } {
  return { ...config, dataFile: config.dataFile.replace(/[^/]+$/, "state.json") };
}

export function isProduction(config: ApiConfig): boolean {
  return config.environment === "production";
}

export function assertProductionGuard(config: ApiConfig, operation: "seed-reset" | "tamper-test"): void {
  if (isProduction(config) && operation === "seed-reset") throw new Error("Seed reset is not available in production.");
}
