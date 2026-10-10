import { PatchSafetyError, type SafetyIssue, safetyIssue } from "./errors";
import { patchOperationSchema, type PatchOperation } from "./operations";

const MAX_OPERATION_BYTES = 16_384;
const CSS_TOKEN = /[{}<>]|url\s*\(|@import|expression\s*\(|javascript\s*:/i;
const EVENT_ATTRIBUTE = /^on[a-z]+$/i;

export const SAFE_CSS_PROPERTIES = new Set([
  "backgroundColor", "color", "borderColor", "borderRadius", "boxShadow", "display", "fontFamily", "fontSize",
  "fontWeight", "gap", "height", "letterSpacing", "lineHeight", "margin", "maxWidth", "minHeight", "opacity",
  "padding", "textAlign", "textDecoration", "transform", "visibility", "width", "zIndex",
]);

export function isSameOriginUrl(value: string, origin: string): boolean {
  try {
    const url = new URL(value, origin);
    const base = new URL(origin);
    return url.origin === base.origin && url.protocol === base.protocol && !url.username && !url.password;
  } catch {
    return false;
  }
}

export function validateOperationSafety(operation: PatchOperation, siteOrigin: string): readonly SafetyIssue[] {
  const issues: SafetyIssue[] = [];
  const serialized = JSON.stringify(operation);
  if (new TextEncoder().encode(serialized).byteLength > MAX_OPERATION_BYTES) {
    issues.push(safetyIssue("PAYLOAD_TOO_LARGE", "operation", "This patch operation is larger than 16 KB.", "Split the change into smaller, reviewable operations."));
  }

  if (operation.kind === "style") {
    if (!SAFE_CSS_PROPERTIES.has(operation.property)) {
      issues.push(safetyIssue("UNSAFE_OPERATION", "property", `The style property “${operation.property}” is not allowlisted.`, "Choose a supported visual property from the style editor."));
    }
    if (CSS_TOKEN.test(operation.value)) {
      issues.push(safetyIssue("UNSAFE_OPERATION", "value", "The style value contains executable or externally loaded CSS.", "Remove url(), @import, expressions, markup, and JavaScript-like values."));
    }
  }

  if (operation.kind === "attribute") {
    if (EVENT_ATTRIBUTE.test(operation.name)) {
      issues.push(safetyIssue("UNSAFE_OPERATION", "name", "Event-handler attributes cannot be changed by a patch.", "Use a supported semantic attribute or create a reviewed code change."));
    }
    if (operation.name === "href" && !isSameOriginUrl(operation.value, siteOrigin)) {
      issues.push(safetyIssue("INVALID_URL", "value", "Links must stay on the connected site origin.", "Use a relative path or a same-origin URL."));
    }
    if (/^javascript:/i.test(operation.value)) {
      issues.push(safetyIssue("UNSAFE_OPERATION", "value", "JavaScript URLs are never allowed in a patch.", "Use a normal same-origin URL or a reviewed application change."));
    }
  }

  if (operation.kind === "text" && /<\/?(script|iframe|object|embed)\b/i.test(operation.value)) {
    issues.push(safetyIssue("UNSAFE_OPERATION", "value", "Markup is not accepted as replacement copy.", "Enter plain text only; PATCHWORK escapes copy before it reaches the page."));
  }

  if (operation.kind === "badge" && /[<>]/.test(operation.label)) {
    issues.push(safetyIssue("UNSAFE_OPERATION", "label", "Badge labels must be plain text.", "Remove markup from the badge label."));
  }

  return issues;
}

export function parseSafeOperation(input: unknown, siteOrigin: string): PatchOperation {
  const parsed = patchOperationSchema.safeParse(input);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    throw new PatchSafetyError(safetyIssue("INVALID_SCHEMA", first?.path.join(".") || "operation", first?.message || "This operation is not valid.", "Correct the highlighted fields and try again."));
  }
  const issues = validateOperationSafety(parsed.data, siteOrigin);
  const first = issues[0];
  if (first) throw new PatchSafetyError(first);
  return parsed.data;
}

export function assertSafeOperation(input: unknown, siteOrigin: string): asserts input is PatchOperation {
  parseSafeOperation(input, siteOrigin);
}
