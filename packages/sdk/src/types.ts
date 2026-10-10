import type { Manifest } from "../../core/src/index";

export type SDKLifecycle = "idle" | "loading" | "ready" | "degraded" | "stopped";

export interface SignedManifestEnvelope {
  manifest: unknown;
  signature: string;
}

export interface SDKStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface SDKHealthEvent {
  id: string;
  releaseId: string;
  type: "browser_check" | "kill_switch" | "request_rate" | "error_rate";
  status: "healthy" | "degraded" | "critical";
  observedAt: string;
  value: number;
  threshold: number | null;
  explanation: string;
}

export interface SDKConfig {
  siteId: string;
  siteOrigin: string;
  environment: Manifest["environment"];
  manifestUrl: string;
  publicKey: CryptoKey;
  fetchImpl?: typeof fetch;
  storage?: SDKStorage;
  now?: () => Date;
  debounceMs?: number;
  failureThreshold?: number;
  telemetryTransport?: (events: readonly SDKHealthEvent[]) => Promise<void>;
  onHealthEvent?: (event: SDKHealthEvent) => void;
}

export interface SDKApplySuccess {
  ok: true;
  patchId: string;
  appliedOperationIds: readonly string[];
  rolledBack: false;
}

export interface SDKApplyFailure {
  ok: false;
  patchId: string;
  code: "NOT_READY" | "INVALID_PATCH" | "TARGET_UNRESOLVED" | "UNSAFE_PATCH" | "CIRCUIT_OPEN" | "APPLY_FAILED";
  message: string;
  rolledBack: boolean;
}

export type SDKApplyResult = SDKApplySuccess | SDKApplyFailure;
