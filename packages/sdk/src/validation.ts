import type { Manifest, Patch } from "../../core/src/index";
import type { PatchOperation } from "../../core/src/operations";

type RecordValue = Record<string, unknown>;

function record(value: unknown, label: string): RecordValue {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${label} must be an object.`);
  return value as RecordValue;
}

function stringValue(value: unknown, label: string): string {
  if (typeof value !== "string" || value.length === 0) throw new Error(`${label} must be a non-empty string.`);
  return value;
}

function arrayValue(value: unknown, label: string): readonly unknown[] {
  if (!Array.isArray(value)) throw new Error(`${label} must be an array.`);
  return value;
}

function validateTarget(value: unknown): void {
  const target = record(value, "operation target");
  stringValue(target.fingerprint, "target fingerprint");
  stringValue(target.fallbackLabel, "target fallback label");
  stringValue(target.expectedTag, "target expected tag");
  if (target.expectedRole !== undefined && typeof target.expectedRole !== "string") throw new Error("target expected role must be a string.");
  if (target.evidence !== undefined) record(target.evidence, "target evidence");
}

export function validateOperation(value: unknown, siteOrigin: string): PatchOperation {
  const operation = record(value, "operation");
  stringValue(operation.id, "operation id");
  validateTarget(operation.target);
  const kind = stringValue(operation.kind, "operation kind");
  if (kind === "style") {
    const property = stringValue(operation.property, "style property");
    const allowed = ["backgroundColor", "color", "borderColor", "borderRadius", "boxShadow", "display", "fontFamily", "fontSize", "fontWeight", "gap", "height", "letterSpacing", "lineHeight", "margin", "maxWidth", "minHeight", "opacity", "padding", "textAlign", "textDecoration", "transform", "visibility", "width", "zIndex"];
    if (!allowed.includes(property)) throw new Error(`The style property “${property}” is not allowlisted.`);
    const valueText = stringValue(operation.value, "style value");
    if (/[{}<>]|url\s*\(|@import|expression\s*\(|javascript\s*:/i.test(valueText)) throw new Error("The style value contains an unsafe CSS construct.");
  } else if (kind === "text") {
    const text = typeof operation.value === "string" ? operation.value : "";
    if (/<\/?(script|iframe|object|embed)\b/i.test(text)) throw new Error("Replacement copy must be plain text.");
  } else if (kind === "attribute") {
    const name = stringValue(operation.name, "attribute name");
    if (!["aria-label", "aria-describedby", "data-testid", "id", "title", "role", "href"].includes(name)) throw new Error(`The attribute “${name}” is not allowlisted.`);
    const attributeValue = stringValue(operation.value, "attribute value");
    if (name === "href") {
      const url = new URL(attributeValue, siteOrigin);
      if (url.origin !== new URL(siteOrigin).origin || /^javascript:|^data:|^vbscript:/i.test(attributeValue)) throw new Error("Links must remain same-origin and non-executable.");
    }
  } else if (kind === "hide") {
    if (typeof operation.hidden !== "boolean") throw new Error("hide.hidden must be a boolean.");
  } else if (kind === "reorder") {
    if (!(["before", "after"] as readonly unknown[]).includes(operation.direction)) throw new Error("reorder.direction must be before or after.");
    stringValue(operation.siblingFingerprint, "reorder sibling fingerprint");
  } else if (kind === "badge") {
    stringValue(operation.label, "badge label");
    if (!["neutral", "info", "success", "warning", "danger"].includes(String(operation.tone))) throw new Error("badge.tone is invalid.");
  } else {
    throw new Error(`Operation kind “${kind}” is not supported.`);
  }
  return value as PatchOperation;
}

export function validatePatch(value: unknown): Patch {
  const patch = record(value, "patch");
  const identity = record(patch.identity, "patch identity");
  const revision = record(patch.revision, "patch revision");
  stringValue(identity.id, "patch id");
  stringValue(identity.siteId, "patch site id");
  stringValue(revision.baseManifestHash, "patch base hash");
  stringValue(revision.contentHash, "patch content hash");
  stringValue(patch.title, "patch title");
  stringValue(patch.description, "patch description");
  const operations = arrayValue(patch.operations, "patch operations");
  if (operations.length === 0) throw new Error("A patch needs at least one operation.");
  for (const operation of operations) {
    const operationRecord = record(operation, "operation");
    stringValue(operationRecord.id, "operation id");
    stringValue(operationRecord.kind, "operation kind");
    validateTarget(operationRecord.target);
  }
  arrayValue(patch.dependencies, "patch dependencies");
  arrayValue(patch.reviewers, "patch reviewers");
  arrayValue(patch.tags, "patch tags");
  return value as Patch;
}

export function validateManifest(value: unknown): Manifest {
  const manifest = record(value, "manifest");
  if (manifest.version !== 1) throw new Error("This manifest version is not supported.");
  stringValue(manifest.siteId, "manifest site id");
  stringValue(manifest.releaseId, "manifest release id");
  if (!["preview", "staging", "production"].includes(String(manifest.environment))) throw new Error("Manifest environment is invalid.");
  stringValue(manifest.baseHash, "manifest base hash");
  arrayValue(manifest.patchHashes, "manifest patch hashes");
  stringValue(manifest.createdAt, "manifest createdAt");
  stringValue(manifest.expiresAt, "manifest expiresAt");
  const killSwitch = record(manifest.killSwitch, "manifest kill switch");
  if (typeof killSwitch.enabled !== "boolean") throw new Error("Manifest kill switch state is invalid.");
  return value as Manifest;
}
