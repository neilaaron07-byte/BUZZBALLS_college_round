import { z } from "zod";
import { normalizeText } from "./fingerprint";

const rgbSchema = z.tuple([z.number().min(0).max(255), z.number().min(0).max(255), z.number().min(0).max(255)]);

export const scanFindingSchema = z.object({
  id: z.string().min(1).max(160),
  detector: z.enum(["contrast", "duplicate_action", "stale_copy", "missing_label", "broken_link", "layout_overflow"]),
  severity: z.enum(["info", "low", "medium", "high", "critical"]),
  confidence: z.number().min(0).max(1),
  targetIds: z.array(z.string().min(1).max(160)).min(1).max(50),
  summary: z.string().min(1).max(240),
  explanation: z.string().min(1).max(1_000),
  evidence: z.array(z.string().min(1).max(500)).min(1).max(20),
  blastRadius: z.object({
    elementCount: z.number().int().positive(),
    pageCount: z.number().int().positive(),
    explanation: z.string().min(1).max(500),
  }).strict(),
}).strict();

export type ScanFinding = z.infer<typeof scanFindingSchema>;

export interface ScanElement {
  id: string;
  tag: string;
  role?: string;
  text: string;
  accessibleName?: string;
  href?: string;
  linkStatus?: number;
  visible: boolean;
  region: string;
  rect: { left: number; top: number; right: number; bottom: number };
  styles?: {
    foreground?: string;
    background?: string;
    fontSizePx?: number;
    fontWeight?: number;
  };
}

export interface ScanSnapshot {
  pageUrl: string;
  viewport: { width: number; height: number };
  elements: readonly ScanElement[];
}

type Rgb = readonly [number, number, number];

function parseColor(value: string): Rgb | null {
  const hex = value.trim().match(/^#([a-f\d]{3}|[a-f\d]{6})$/i)?.[1];
  if (hex) {
    if (hex.length === 3) return rgbSchema.parse([...hex].map((channel) => Number.parseInt(`${channel}${channel}`, 16)));
    return rgbSchema.parse([0, 2, 4].map((index) => Number.parseInt(hex.slice(index, index + 2), 16)));
  }
  const rgb = value.trim().match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
  if (rgb) return rgbSchema.parse([Number(rgb[1]), Number(rgb[2]), Number(rgb[3])]);
  return null;
}

function luminance(rgb: Rgb): number {
  const channels = rgb.map((channel) => channel / 255).map((channel) => channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);
  return 0.2126 * (channels[0] ?? 0) + 0.7152 * (channels[1] ?? 0) + 0.0722 * (channels[2] ?? 0);
}

export function contrastRatio(foreground: string, background: string): number | null {
  const foregroundRgb = parseColor(foreground);
  const backgroundRgb = parseColor(background);
  if (!foregroundRgb || !backgroundRgb) return null;
  const light = Math.max(luminance(foregroundRgb), luminance(backgroundRgb));
  const dark = Math.min(luminance(foregroundRgb), luminance(backgroundRgb));
  return Number(((light + 0.05) / (dark + 0.05)).toFixed(2));
}

function finding(input: Omit<ScanFinding, "id"> & { id: string }): ScanFinding {
  return scanFindingSchema.parse(input);
}

export function detectContrast(snapshot: ScanSnapshot): readonly ScanFinding[] {
  return snapshot.elements.flatMap((element) => {
    if (!element.visible || !element.text || !element.styles?.foreground || !element.styles.background) return [];
    const ratio = contrastRatio(element.styles.foreground, element.styles.background);
    if (ratio === null) return [];
    const large = (element.styles.fontSizePx ?? 16) >= 18.66 || ((element.styles.fontSizePx ?? 16) >= 14 && (element.styles.fontWeight ?? 400) >= 700);
    const minimum = large ? 3 : 4.5;
    if (ratio >= minimum) return [];
    return [finding({
      id: `contrast-${element.id}`,
      detector: "contrast",
      severity: ratio < 3 ? "high" : "medium",
      confidence: 0.99,
      targetIds: [element.id],
      summary: "Text contrast is below the accessible threshold.",
      explanation: `${element.id} measures ${ratio}:1 contrast; this text needs at least ${minimum}:1 at its current size.`,
      evidence: [`Foreground ${element.styles.foreground}`, `Background ${element.styles.background}`, `Measured ratio ${ratio}:1`],
      blastRadius: { elementCount: 1, pageCount: 1, explanation: "Only this rendered text target is affected." },
    })];
  });
}

export function detectDuplicateActions(snapshot: ScanSnapshot): readonly ScanFinding[] {
  const interactive = snapshot.elements.filter((element) => element.visible && ["button", "a"].includes(element.tag.toLowerCase()) || element.role === "button" || element.role === "link");
  const groups = new Map<string, ScanElement[]>();
  for (const element of interactive) {
    const key = `${normalizeText(element.accessibleName || element.text)}::${element.region}`;
    if (!key.startsWith("::")) groups.set(key, [...(groups.get(key) ?? []), element]);
  }
  return [...groups.entries()].flatMap(([key, elements]) => {
    if (elements.length < 2) return [];
    const targetIds = elements.map((element) => element.id);
    return [finding({
      id: `duplicate-action-${targetIds.join("-")}`,
      detector: "duplicate_action",
      severity: "medium",
      confidence: 0.96,
      targetIds,
      summary: "Two actions look identical in the same region.",
      explanation: `The label “${key.split("::")[0]}” appears ${elements.length} times in the ${key.split("::")[1]} region.`,
      evidence: targetIds.map((id) => `Interactive target ${id}`),
      blastRadius: { elementCount: elements.length, pageCount: 1, explanation: "Users may not know which action controls the current panel." },
    })];
  });
}

export function detectStaleCopy(snapshot: ScanSnapshot): readonly ScanFinding[] {
  return snapshot.elements.flatMap((element) => /\b(?:draft copy|sample text|unfinished sentence|replace before launch)\b/i.test(element.text) ? [finding({
    id: `stale-copy-${element.id}`,
    detector: "stale_copy",
    severity: "low",
    confidence: 0.91,
    targetIds: [element.id],
    summary: "Copy looks unfinished for a published page.",
    explanation: `The text in ${element.id} contains a draft marker that should be reviewed before release.`,
    evidence: [element.text],
    blastRadius: { elementCount: 1, pageCount: 1, explanation: "The finding is limited to one copy block." },
  })] : []);
}

export function detectMissingLabels(snapshot: ScanSnapshot): readonly ScanFinding[] {
  return snapshot.elements.flatMap((element) => {
    const interactive = ["button", "a", "input", "textarea", "select"].includes(element.tag.toLowerCase()) || ["button", "link", "textbox"].includes(element.role ?? "");
    if (!interactive || !element.visible || element.accessibleName || normalizeText(element.text)) return [];
    return [finding({
      id: `missing-label-${element.id}`,
      detector: "missing_label",
      severity: "high",
      confidence: 0.98,
      targetIds: [element.id],
      summary: "Interactive control has no accessible name.",
      explanation: `${element.tag} ${element.id} cannot be understood by a screen reader or voice control.`,
      evidence: ["No visible text", "No accessibleName", "No label signal"],
      blastRadius: { elementCount: 1, pageCount: 1, explanation: "Keyboard and assistive-technology users cannot identify this control." },
    })];
  });
}

export function detectBrokenLinks(snapshot: ScanSnapshot): readonly ScanFinding[] {
  return snapshot.elements.flatMap((element) => element.href && element.linkStatus !== undefined && (element.linkStatus < 200 || element.linkStatus >= 400) ? [finding({
    id: `broken-link-${element.id}`,
    detector: "broken_link",
    severity: element.linkStatus >= 500 ? "high" : "medium",
    confidence: 0.99,
    targetIds: [element.id],
    summary: "Link does not return a successful response.",
    explanation: `${element.href} returned HTTP ${element.linkStatus}.`,
    evidence: [`URL ${element.href}`, `HTTP status ${element.linkStatus}`],
    blastRadius: { elementCount: 1, pageCount: 1, explanation: "Visitors following this link reach an error response." },
  })] : []);
}

export function detectOverflow(snapshot: ScanSnapshot): readonly ScanFinding[] {
  return snapshot.elements.flatMap((element) => element.visible && (element.rect.right > snapshot.viewport.width || element.rect.bottom > snapshot.viewport.height) ? [finding({
    id: `overflow-${element.id}`,
    detector: "layout_overflow",
    severity: "medium",
    confidence: 0.95,
    targetIds: [element.id],
    summary: "Element extends beyond the viewport.",
    explanation: `${element.id} ends at ${element.rect.right}×${element.rect.bottom} inside a ${snapshot.viewport.width}×${snapshot.viewport.height} viewport.`,
    evidence: [`Right edge ${element.rect.right}`, `Bottom edge ${element.rect.bottom}`],
    blastRadius: { elementCount: 1, pageCount: 1, explanation: "The layout can scroll or clip unexpectedly at this viewport size." },
  })] : []);
}

export function scanPage(snapshot: ScanSnapshot): readonly ScanFinding[] {
  const findings = [
    ...detectContrast(snapshot),
    ...detectDuplicateActions(snapshot),
    ...detectStaleCopy(snapshot),
    ...detectMissingLabels(snapshot),
    ...detectBrokenLinks(snapshot),
    ...detectOverflow(snapshot),
  ];
  const severityRank: Record<ScanFinding["severity"], number> = { critical: 5, high: 4, medium: 3, low: 2, info: 1 };
  return findings.sort((left, right) => severityRank[right.severity] - severityRank[left.severity]);
}
