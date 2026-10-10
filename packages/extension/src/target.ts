import { fingerprintFromSnapshot, isNoisyClassToken, type ElementSnapshot, type SemanticFingerprint } from "../../core/src/fingerprint";
import { sha256 } from "../../core/src/canonical";
import type { ResolverPreview, TargetPreview } from "./protocol";

function elementAttributes(element: Element): Record<string, string> {
  const attributes: Record<string, string> = {};
  for (const name of element.getAttributeNames()) {
    const value = element.getAttribute(name);
    if (value !== null) attributes[name] = value;
  }
  return attributes;
}

export function snapshotElement(element: Element): ElementSnapshot {
  const path: string[] = [];
  let current: Element | null = element;
  while (current && path.length < 8) {
    path.unshift(current.tagName.toLowerCase());
    current = current.parentElement;
  }
  const rect = element.getBoundingClientRect();
  const viewportWidth = globalThis.innerWidth || 1;
  const viewportHeight = globalThis.innerHeight || 1;
  return {
    tag: element.tagName.toLowerCase(),
    attributes: elementAttributes(element),
    text: element.textContent ?? "",
    path,
    siblings: Array.from(element.parentElement?.children ?? []).map((child) => child.tagName.toLowerCase()),
    landmarks: path.filter((tag) => ["main", "nav", "header", "footer", "section", "article", "aside"].includes(tag)),
    rect: { top: rect.top, left: rect.left, width: rect.width, height: rect.height, viewportWidth, viewportHeight },
  };
}

export function domBreadcrumb(element: Element): readonly string[] {
  const labels: string[] = [];
  let current: Element | null = element;
  while (current && labels.length < 6) {
    const tag = current.tagName.toLowerCase();
    const id = current.getAttribute("id");
    const testId = current.getAttribute("data-testid");
    labels.unshift(`${tag}${id ? `#${id}` : testId ? `[data-testid="${testId}"]` : ""}`);
    current = current.parentElement;
  }
  return labels;
}

export function fingerprintWarnings(fingerprint: SemanticFingerprint): readonly string[] {
  const warnings: string[] = [];
  if (!fingerprint.attributes.id && !fingerprint.attributes.testId && !fingerprint.attributes.role && !fingerprint.attributes.ariaLabel) warnings.push("No durable id, test id, role, or accessible label was found.");
  if (fingerprint.attributes.meaningfulClasses.length === 0) warnings.push("Class names are missing or look generated; structural evidence will carry more weight.");
  if (fingerprint.path.length > 6) warnings.push("The target is deeply nested and may move when wrappers change.");
  return warnings;
}

export async function previewTarget(element: Element): Promise<TargetPreview> {
  const evidence = fingerprintFromSnapshot(snapshotElement(element));
  const fingerprint = await sha256(JSON.stringify(evidence));
  return {
    fingerprint,
    evidence,
    tag: evidence.tag,
    label: element.textContent?.trim().slice(0, 120) || evidence.visualRole,
    breadcrumb: domBreadcrumb(element),
    warnings: fingerprintWarnings(evidence),
  };
}

export function fragileClassWarnings(element: Element): readonly string[] {
  return (element.getAttribute("class") ?? "").split(/\s+/).filter(Boolean).filter(isNoisyClassToken).map((token) => `Generated class token “${token}” will not be trusted as the only target signal.`);
}

export function resolverPreviewFromResult(result: { outcome: ResolverPreview["outcome"]; confidence: number; reason: string; signals: ResolverPreview["signals"] }): ResolverPreview {
  return { outcome: result.outcome, confidence: result.confidence, reason: result.reason, signals: result.signals };
}
