export type VerificationStatus = "passed" | "warning" | "failed" | "skipped";
export type VerificationCheckKind = "load" | "resolution" | "interaction" | "visual" | "accessibility" | "console" | "network";

export interface ViewportSpec {
  id: "desktop" | "tablet" | "mobile";
  width: number;
  height: number;
}

export interface VerificationCheck {
  id: string;
  kind: VerificationCheckKind;
  label: string;
  status: VerificationStatus;
  blocking: boolean;
  explanation: string;
  durationMs: number;
  evidence: readonly string[];
}

export interface ScreenshotEvidence {
  viewport: ViewportSpec["id"];
  publishedPath: string;
  patchedPath: string;
  changedPixels: number;
  changedRegion: { left: number; top: number; right: number; bottom: number } | null;
}

export interface VerificationReport {
  schemaVersion: 1;
  id: string;
  createdAt: string;
  publishedUrl: string;
  patchedUrl: string;
  viewports: readonly ViewportSpec[];
  checks: readonly VerificationCheck[];
  screenshots: readonly ScreenshotEvidence[];
  score: number;
  status: "passed" | "warning" | "blocked";
  summary: string;
}

export interface ResolverTargetInput {
  fingerprint: string;
  evidence: import("../../core/src/fingerprint").SemanticFingerprint;
  expectedTag: string;
  expectedRole?: string;
  fallbackLabel: string;
}

export interface VerificationRunOptions {
  timeoutMs?: number;
  failOnNetworkError?: boolean;
}

export interface VerificationConfig {
  id: string;
  publishedUrl: string;
  patchedUrl: string;
  viewports?: readonly ViewportSpec[];
  target?: ResolverTargetInput;
  outputDirectory?: string;
  browserType?: import("playwright").BrowserType;
  options?: VerificationRunOptions;
  now?: () => Date;
}
