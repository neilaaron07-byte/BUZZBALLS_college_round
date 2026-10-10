export const FINGERPRINT_VERSION = 1 as const;

export type ViewportRegion = "top-left" | "top-center" | "top-right" | "middle-left" | "middle-center" | "middle-right" | "bottom-left" | "bottom-center" | "bottom-right";
export type VisualRole = "button" | "link" | "input" | "heading" | "navigation" | "card" | "media" | "text" | "unknown";

export interface ElementRect {
  top: number;
  left: number;
  width: number;
  height: number;
  viewportWidth: number;
  viewportHeight: number;
}

export interface ElementSnapshot {
  tag: string;
  attributes: Readonly<Record<string, string>>;
  text: string;
  path: readonly string[];
  siblings: readonly string[];
  landmarks: readonly string[];
  rect: ElementRect;
  visualRole?: VisualRole;
}

export interface StableAttributes {
  id?: string;
  testId?: string;
  name?: string;
  role?: string;
  ariaLabel?: string;
  hrefPattern?: string;
  meaningfulClasses: readonly string[];
}

export interface SemanticFingerprint {
  version: typeof FINGERPRINT_VERSION;
  tag: string;
  attributes: StableAttributes;
  normalizedText: string;
  textTokens: readonly string[];
  textNgrams: readonly string[];
  path: readonly string[];
  siblingSignature: readonly string[];
  landmarkChain: readonly string[];
  region: ViewportRegion;
  visualRole: VisualRole;
}

export function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export function normalizeText(value: string): string {
  return normalizeWhitespace(value)
    .toLocaleLowerCase("en-US")
    .replace(/\b\d+(?:[.,]\d+)?\b/g, "#")
    .replace(/[^a-z0-9#]+/g, " ")
    .trim();
}

export function normalizeToken(value: string): string {
  return normalizeText(value).replace(/ /g, "-");
}

export function tokenise(value: string): readonly string[] {
  return normalizeText(value).split(" ").filter(Boolean);
}

export function ngrams(tokens: readonly string[], size = 2): readonly string[] {
  if (tokens.length <= size) return tokens.length > 0 ? [tokens.join(" ")] : [];
  return tokens.slice(0, tokens.length - size + 1).map((_, index) => tokens.slice(index, index + size).join(" "));
}

export function isNoisyClassToken(token: string): boolean {
  return /(?:^|[-_])[a-f0-9]{6,}$/.test(token) || /^[a-z]{1,5}_[a-z0-9]{5,}$/i.test(token) || /^css-[a-z0-9]{6,}$/i.test(token);
}

export function meaningfulClassTokens(value: string | undefined): readonly string[] {
  return (value ?? "").split(/\s+/).map(normalizeToken).filter(Boolean);
}

export function stableClassTokens(value: string | undefined): readonly string[] {
  return meaningfulClassTokens(value).filter((token) => !isNoisyClassToken(token));
}

export function hrefPattern(value: string | undefined): string | undefined {
  if (!value) return undefined;
  try {
    const url = new URL(value, "https://patchwork.invalid");
    return `${url.pathname.replace(/\/\d+(?=\/|$)/g, "/#")}${url.search ? "?query" : ""}`;
  } catch {
    return normalizeWhitespace(value).replace(/\d+/g, "#");
  }
}

export function inferVisualRole(snapshot: Pick<ElementSnapshot, "tag" | "attributes" | "visualRole">): VisualRole {
  if (snapshot.visualRole) return snapshot.visualRole;
  const role = snapshot.attributes.role?.toLowerCase();
  if (role === "button" || snapshot.tag.toLowerCase() === "button") return "button";
  if (role === "link" || snapshot.tag.toLowerCase() === "a") return "link";
  if (role === "navigation" || snapshot.tag.toLowerCase() === "nav") return "navigation";
  if (role === "heading" || /^h[1-6]$/.test(snapshot.tag.toLowerCase())) return "heading";
  if (["input", "textarea", "select"].includes(snapshot.tag.toLowerCase())) return "input";
  if (["img", "video", "picture"].includes(snapshot.tag.toLowerCase())) return "media";
  if (["article", "section", "aside"].includes(snapshot.tag.toLowerCase())) return "card";
  if (snapshot.tag.toLowerCase() === "p") return "text";
  return "unknown";
}

export function viewportRegion(rect: ElementRect): ViewportRegion {
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  const horizontal = centerX < rect.viewportWidth / 3 ? "left" : centerX < rect.viewportWidth * 2 / 3 ? "center" : "right";
  const vertical = centerY < rect.viewportHeight / 3 ? "top" : centerY < rect.viewportHeight * 2 / 3 ? "middle" : "bottom";
  return `${vertical}-${horizontal}` as ViewportRegion;
}

export function stableAttributes(attributes: Readonly<Record<string, string>>): StableAttributes {
  return {
    id: attributes.id ? normalizeToken(attributes.id) : undefined,
    testId: attributes["data-testid"] ? normalizeToken(attributes["data-testid"]) : undefined,
    name: attributes.name ? normalizeToken(attributes.name) : undefined,
    role: attributes.role ? normalizeToken(attributes.role) : undefined,
    ariaLabel: attributes["aria-label"] ? normalizeText(attributes["aria-label"]) : undefined,
    hrefPattern: hrefPattern(attributes.href),
    meaningfulClasses: stableClassTokens(attributes.class),
  };
}

export function fingerprintFromSnapshot(snapshot: ElementSnapshot): SemanticFingerprint {
  const normalizedText = normalizeText(snapshot.text);
  const textTokens = tokenise(snapshot.text);
  return {
    version: FINGERPRINT_VERSION,
    tag: snapshot.tag.toLowerCase(),
    attributes: stableAttributes(snapshot.attributes),
    normalizedText,
    textTokens,
    textNgrams: ngrams(textTokens),
    path: snapshot.path.map(normalizeToken),
    siblingSignature: snapshot.siblings.map(normalizeToken).filter(Boolean),
    landmarkChain: snapshot.landmarks.map(normalizeToken).filter(Boolean),
    region: viewportRegion(snapshot.rect),
    visualRole: inferVisualRole(snapshot),
  };
}
