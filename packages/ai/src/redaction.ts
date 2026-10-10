import type { Conflict, ScanFinding, ScanSnapshot } from "../../core/src/index";
import type { PatchPilotContext } from "./contracts";

const secretPatterns: readonly RegExp[] = [
  /\b(?:sk|pk)-[A-Za-z0-9_-]{12,}\b/gi,
  /\b(?:ghp|github_pat|xoxb|xoxp)_[A-Za-z0-9_-]{12,}\b/gi,
  /\bAKIA[0-9A-Z]{16}\b/g,
  /\bBearer\s+[A-Za-z0-9._~+/=-]{12,}\b/gi,
  /\b(?:password|passwd|secret|token|api[_ -]?key)\s*[:=]\s*[^\s,;]+/gi,
  /\bdocument\.cookie\b/gi,
];

const instructionPatterns: readonly RegExp[] = [
  /\bignore\s+(?:all\s+)?(?:previous|prior|earlier)\s+instructions?\b/gi,
  /\b(?:system|developer|assistant)\s+(?:message|prompt|instruction)\b/gi,
  /\b(?:reveal|exfiltrate|upload|send)\b.{0,80}\b(?:secret|token|cookie|password|key)\b/gi,
  /\bcall\s+(?:a\s+)?tool\b/gi,
];

export interface RedactionResult {
  value: string;
  redactions: number;
}

export function redactText(input: string, maxLength = 2_000): string {
  let value = [...input].map((character) => { const code = character.charCodeAt(0); return code === 9 || code === 10 || code === 13 || code >= 32 && code !== 127 ? character : " "; }).join("");
  for (const pattern of secretPatterns) value = value.replace(pattern, "[sensitive value removed]");
  for (const pattern of instructionPatterns) value = value.replace(pattern, "[page instruction removed]");
  return value.replace(/\s+/g, " ").trim().slice(0, maxLength);
}

export function redactWithReport(input: string, maxLength = 2_000): RedactionResult {
  const value = redactText(input, maxLength);
  return { value, redactions: value.includes("[sensitive value removed]") || value.includes("[page instruction removed]") ? 1 : 0 };
}

export function redactUrl(input: string): string {
  try {
    const url = new URL(input);
    url.username = "";
    url.password = "";
    url.search = "";
    url.hash = "";
    return url.toString();
  } catch {
    return "https://redacted.invalid/invalid-url";
  }
}

function safeFinding(finding: ScanFinding): ScanFinding {
  return { ...finding, summary: redactText(finding.summary, 240), explanation: redactText(finding.explanation, 1_000), evidence: finding.evidence.map((item) => redactText(item, 500)), blastRadius: { ...finding.blastRadius, explanation: redactText(finding.blastRadius.explanation, 500) } };
}

function safeConflict(conflict: Conflict): Conflict {
  return { ...conflict, explanation: redactText(conflict.explanation, 1_000), suggestedResolution: redactText(conflict.suggestedResolution, 1_000) };
}

function safeSnapshot(snapshot: ScanSnapshot): ScanSnapshot {
  return { ...snapshot, pageUrl: redactUrl(snapshot.pageUrl), elements: snapshot.elements.map((element) => ({ ...element, text: redactText(element.text), accessibleName: element.accessibleName ? redactText(element.accessibleName, 500) : undefined, href: element.href ? redactUrl(element.href) : undefined })) };
}

export function sanitizePatchPilotContext(context: PatchPilotContext): PatchPilotContext {
  return {
    ...context,
    pageUrl: redactUrl(context.pageUrl),
    findings: context.findings?.map(safeFinding),
    conflicts: context.conflicts?.map(safeConflict),
    snapshot: context.snapshot ? safeSnapshot(context.snapshot) : undefined,
    candidates: context.candidates?.map((candidate) => ({ ...candidate, label: redactText(candidate.label, 500) })),
  };
}

export function sanitizePatchPilotQuestion(question: string | undefined): string | undefined {
  return question === undefined ? undefined : redactText(question, 1_000);
}
