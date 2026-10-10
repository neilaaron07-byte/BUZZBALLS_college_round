export type SafetyErrorCode =
  | "UNSAFE_OPERATION"
  | "INVALID_TARGET"
  | "INVALID_URL"
  | "PAYLOAD_TOO_LARGE"
  | "INVALID_SCHEMA";

export interface SafetyIssue {
  code: SafetyErrorCode;
  path: string;
  message: string;
  remediation: string;
}

export class PatchSafetyError extends Error {
  readonly code: SafetyErrorCode;
  readonly path: string;
  readonly remediation: string;

  constructor(issue: SafetyIssue) {
    super(issue.message);
    this.name = "PatchSafetyError";
    this.code = issue.code;
    this.path = issue.path;
    this.remediation = issue.remediation;
  }
}

export function safetyIssue(
  code: SafetyErrorCode,
  path: string,
  message: string,
  remediation: string,
): SafetyIssue {
  return { code, path, message, remediation };
}
