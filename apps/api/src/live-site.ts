import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { randomUUID } from "node:crypto";
import { JSDOM } from "jsdom";
import { liveScanRequestSchema, liveSiteTargetSchema, type LiveScanRequest, type LiveSiteTarget } from "./contracts";
import { ApiError, notFound } from "./errors";
import { readState, runScan } from "./services";
import type { ApiContext } from "./types";
import type { ScanElement, ScanSnapshot } from "../../../packages/core/src/index";

const privateHostnames = new Set(["localhost", "local", "internal", "intranet", "home.arpa", "test"]);
const redirectStatuses = new Set([301, 302, 303, 307, 308]);

export type LiveScanPhase = "queued" | "validating" | "fetching" | "parsing" | "analyzing" | "completed" | "failed";

export interface LiveScanEvent {
  id: number;
  phase: LiveScanPhase;
  progress: number;
  message: string;
  at: string;
}

export interface LiveSiteSnapshot extends ScanSnapshot {
  source: "server_html";
  fetchedAt: string;
  httpStatus: number;
  contentType: string;
  bytes: number;
  title: string;
  previewHtml: string;
}

export interface LiveScanResult {
  target: LiveSiteTarget;
  snapshot: LiveSiteSnapshot;
  scan: Awaited<ReturnType<typeof runScan>>;
  findings: Awaited<ReturnType<typeof readState>>["findings"];
}

export interface LiveScanJob {
  id: string;
  target: LiveScanRequest;
  status: "queued" | "running" | "completed" | "failed";
  createdAt: string;
  updatedAt: string;
  events: LiveScanEvent[];
  result: LiveScanResult | null;
  error: string | null;
  listeners: Set<(event: LiveScanEvent) => void>;
}

export interface LiveFetchResponse {
  html: string;
  finalUrl: string;
  status: number;
  contentType: string;
  bytes: number;
}

export interface LiveSiteDependencies {
  fetcher?: typeof fetch;
  lookup?: (hostname: string) => Promise<readonly { address: string; family: number }[]>;
  now?: () => Date;
}

function nowIso(now: () => Date = () => new Date()): string {
  return now().toISOString();
}

function hostIsBlocked(hostname: string): boolean {
  const normalized = hostname.toLowerCase().replace(/\.$/, "");
  return privateHostnames.has(normalized) || [...privateHostnames].some((suffix) => normalized.endsWith(`.${suffix}`));
}

function ipv4IsPrivate(address: string): boolean {
  const octets = address.split(".").map(Number);
  if (octets.length !== 4 || octets.some((octet) => !Number.isInteger(octet) || octet < 0 || octet > 255)) return true;
  const first = octets[0] ?? -1;
  const second = octets[1] ?? -1;
  return first === 0 || first === 10 || first === 127 || first === 169 && second === 254 || first === 172 && second !== undefined && second >= 16 && second <= 31 || first === 192 && second === 168 || first === 100 && second !== undefined && second >= 64 && second <= 127 || first === 198 && second !== undefined && second >= 18 && second <= 19 || first >= 224;
}

function ipv6IsPrivate(address: string): boolean {
  const normalized = address.toLowerCase();
  if (normalized === "::1" || normalized.startsWith("fc") || normalized.startsWith("fd") || normalized.startsWith("fe8") || normalized.startsWith("fe9") || normalized.startsWith("fea") || normalized.startsWith("feb")) return true;
  const mapped = normalized.match(/::ffff:(\d+\.\d+\.\d+\.\d+)$/)?.[1];
  return mapped ? ipv4IsPrivate(mapped) : false;
}

export function isPrivateAddress(address: string): boolean {
  const family = isIP(address);
  return family === 4 ? ipv4IsPrivate(address) : family === 6 ? ipv6IsPrivate(address) : true;
}

export async function validateLiveSiteUrl(rawUrl: string, dependencies: Pick<LiveSiteDependencies, "lookup"> = {}): Promise<URL> {
  if (rawUrl.length > 2_048) throw new ApiError(400, "LIVE_URL_TOO_LONG", "The live site URL must be 2,048 characters or fewer.");
  let url: URL;
  try { url = new URL(rawUrl); } catch { throw new ApiError(400, "LIVE_URL_INVALID", "Enter a complete public http or https URL."); }
  if (!/[a-z][a-z\d+.-]*:$/i.test(url.protocol) || !["http:", "https:"].includes(url.protocol)) throw new ApiError(400, "LIVE_PROTOCOL_BLOCKED", "Only public http and https pages can be scanned.");
  if (url.username || url.password) throw new ApiError(400, "LIVE_CREDENTIALS_BLOCKED", "URLs with embedded credentials are not accepted.");
  if (url.port && !["80", "443"].includes(url.port)) throw new ApiError(400, "LIVE_PORT_BLOCKED", "Only standard web ports 80 and 443 are accepted.");
  if (hostIsBlocked(url.hostname)) throw new ApiError(400, "LIVE_HOST_BLOCKED", "Local, private, and internal hostnames cannot be scanned.");
  if (isIP(url.hostname) && isPrivateAddress(url.hostname)) throw new ApiError(400, "LIVE_ADDRESS_BLOCKED", "Private and loopback network addresses cannot be scanned.");
  const lookupHost = dependencies.lookup ?? (async (hostname: string) => lookup(hostname, { all: true, verbatim: true }));
  if (!isIP(url.hostname)) {
    let addresses: readonly { address: string; family: number }[];
    try { addresses = await lookupHost(url.hostname); } catch { throw new ApiError(400, "LIVE_DNS_FAILED", "PATCHWORK could not resolve that public hostname safely."); }
    if (addresses.length === 0 || addresses.some((entry) => isPrivateAddress(entry.address))) throw new ApiError(400, "LIVE_DNS_BLOCKED", "That hostname resolves to a private or loopback network.");
  }
  return url;
}

async function readBoundedBody(response: Response, maxBytes: number): Promise<{ text: string; bytes: number }> {
  if (!response.body) {
    const text = await response.text();
    const bytes = Buffer.byteLength(text, "utf8");
    if (bytes > maxBytes) throw new ApiError(413, "LIVE_BODY_TOO_LARGE", `The page is larger than the ${Math.round(maxBytes / 1_000)} KB scan limit.`);
    return { text, bytes };
  }
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  try {
    while (true) {
      const next = await reader.read();
      if (next.done) break;
      bytes += next.value.byteLength;
      if (bytes > maxBytes) {
        await reader.cancel("body limit");
        throw new ApiError(413, "LIVE_BODY_TOO_LARGE", `The page is larger than the ${Math.round(maxBytes / 1_000)} KB scan limit.`);
      }
      chunks.push(next.value);
    }
  } finally { reader.releaseLock(); }
  return { text: Buffer.concat(chunks.map((chunk) => Buffer.from(chunk))).toString("utf8"), bytes };
}

export async function fetchLivePage(rawUrl: string, options: { maxBytes?: number; timeoutMs?: number; maxRedirects?: number } & LiveSiteDependencies = {}): Promise<LiveFetchResponse> {
  const maxBytes = options.maxBytes ?? 512_000;
  const timeoutMs = options.timeoutMs ?? 8_000;
  const maxRedirects = options.maxRedirects ?? 3;
  const fetcher = options.fetcher ?? fetch;
  let current = await validateLiveSiteUrl(rawUrl, { lookup: options.lookup });
  for (let redirect = 0; redirect <= maxRedirects; redirect += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    let response: Response;
    try {
      response = await fetcher(current.toString(), { method: "GET", redirect: "manual", signal: controller.signal, headers: { accept: "text/html,application/xhtml+xml", "user-agent": "PATCHWORK/0.1 live scanner" } });
    } catch (error) {
      if (error instanceof ApiError) throw error;
      if (error instanceof Error && error.name === "AbortError") throw new ApiError(504, "LIVE_TIMEOUT", "The live page did not respond before the scan timeout.");
      throw new ApiError(502, "LIVE_FETCH_FAILED", "PATCHWORK could not fetch the live page safely.");
    } finally { clearTimeout(timeout); }
    if (redirectStatuses.has(response.status)) {
      if (redirect >= maxRedirects) throw new ApiError(502, "LIVE_REDIRECT_LIMIT", "The live page exceeded PATCHWORK's redirect limit.");
      const location = response.headers.get("location");
      if (!location) throw new ApiError(502, "LIVE_REDIRECT_INVALID", "The live page returned a redirect without a destination.");
      current = await validateLiveSiteUrl(new URL(location, current).toString(), { lookup: options.lookup });
      continue;
    }
    const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
    if (!contentType.includes("text/html") && !contentType.includes("application/xhtml+xml")) throw new ApiError(415, "LIVE_CONTENT_UNSUPPORTED", "The live target did not return an HTML document.");
    const body = await readBoundedBody(response, maxBytes);
    return { html: body.text, finalUrl: current.toString(), status: response.status, contentType, bytes: body.bytes };
  }
  throw new ApiError(502, "LIVE_REDIRECT_LIMIT", "The live page exceeded PATCHWORK's redirect limit.");
}

function compactText(value: string | null | undefined, max = 2_000): string {
  return (value ?? "").replace(/\s+/g, " ").trim().slice(0, max);
}

function styleValue(element: Element, property: string): string | undefined {
  const style = element.getAttribute("style") ?? "";
  const value = style.split(";").map((rule) => rule.split(":" ).map((part) => part.trim())).find(([key]) => key?.toLowerCase() === property);
  return value?.[1] || undefined;
}

function numericStyle(element: Element, property: string): number | undefined {
  const value = styleValue(element, property);
  const parsed = value ? Number.parseFloat(value) : Number.NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function accessibleName(element: Element, document: Document): string | undefined {
  const direct = element.getAttribute("aria-label") ?? element.getAttribute("title") ?? element.getAttribute("placeholder");
  if (direct) return compactText(direct, 500);
  const id = element.getAttribute("id");
  if (id) {
    const label = [...document.querySelectorAll("label")].find((candidate) => candidate.getAttribute("for") === id);
    if (label?.textContent) return compactText(label.textContent, 500);
  }
  const parentLabel = element.closest("label");
  return parentLabel?.textContent ? compactText(parentLabel.textContent, 500) : undefined;
}

function safeElementId(element: Element, tag: string, index: number, seen: Set<string>): string {
  const raw = element.getAttribute("data-patchwork-id") ?? element.getAttribute("data-testid") ?? element.getAttribute("id") ?? `live-${tag}-${index + 1}`;
  const base = raw.replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 120) || `live-${tag}-${index + 1}`;
  let candidate = base;
  let suffix = 2;
  while (seen.has(candidate)) candidate = `${base}-${suffix++}`;
  seen.add(candidate);
  return candidate;
}

/**
 * Produce a passive document for the operator preview. A live page is never
 * replayed in the browser: scripts, navigation, embeds, external resources,
 * event handlers, and form submissions are removed before the HTML crosses
 * the API boundary.
 */
export function sanitizeLivePreviewHtml(html: string, pageUrl: string): string {
  const dom = new JSDOM(html, { url: pageUrl });
  const { document } = dom.window;
  document.querySelectorAll("script, iframe, object, embed, base, link, meta[http-equiv]").forEach((element) => element.remove());
  document.querySelectorAll("*").forEach((element) => {
    for (const attribute of [...element.attributes]) {
      const name = attribute.name.toLowerCase();
      if (name.startsWith("on") || ["src", "srcset", "poster"].includes(name)) element.removeAttribute(attribute.name);
      if (name === "href") {
        if (element.tagName.toLowerCase() === "a") element.setAttribute("href", "#");
        else element.removeAttribute(attribute.name);
      }
      if (name === "action" || name === "formaction") element.setAttribute(attribute.name, "#");
      if (name === "style") element.setAttribute("style", attribute.value.replace(/url\s*\([^)]*\)/gi, "none"));
    }
    if (element.tagName.toLowerCase() === "form") {
      element.setAttribute("data-patchwork-preview-form", "true");
      element.setAttribute("onsubmit", "return false");
      element.removeAttribute("onsubmit");
    }
  });
  document.querySelectorAll("style").forEach((element) => {
    element.textContent = (element.textContent ?? "").replace(/@import[^;]+;?/gi, "").replace(/url\s*\([^)]*\)/gi, "none");
  });
  const output = `<!doctype html>${document.documentElement.outerHTML}`;
  dom.window.close();
  return output;
}

export function extractLiveSnapshot(html: string, pageUrl: string, viewport = { width: 1_440, height: 900 }, fetched: Pick<LiveFetchResponse, "status" | "contentType" | "bytes"> = { status: 200, contentType: "text/html", bytes: Buffer.byteLength(html, "utf8") }, now: () => Date = () => new Date()): LiveSiteSnapshot {
  const dom = new JSDOM(html, { url: pageUrl });
  const { document } = dom.window;
  const seen = new Set<string>();
  const selectors = "button,a,input,textarea,select,[role],h1,h2,h3,p";
  const elements = [...document.querySelectorAll(selectors)].slice(0, 500).map((element, index): ScanElement => {
    const tag = element.tagName.toLowerCase();
    const hidden = element.hasAttribute("hidden") || element.getAttribute("aria-hidden") === "true" || /display\s*:\s*none|visibility\s*:\s*hidden/i.test(element.getAttribute("style") ?? "") || element.getAttribute("type") === "hidden";
    const text = compactText(element.textContent);
    const hrefValue = element.getAttribute("href");
    let href: string | undefined;
    try { href = hrefValue ? new URL(hrefValue, pageUrl).toString() : undefined; } catch { href = undefined; }
    const left = Number.parseFloat(element.getAttribute("data-patchwork-left") ?? "24");
    const top = Number.parseFloat(element.getAttribute("data-patchwork-top") ?? String(48 + index * 28));
    const width = Number.parseFloat(element.getAttribute("data-patchwork-width") ?? String(Math.min(320, Math.max(48, text.length * 7 + 24))));
    const height = Number.parseFloat(element.getAttribute("data-patchwork-height") ?? "28");
    const region = element.closest("header,nav,main,aside,footer")?.tagName.toLowerCase() ?? "document";
    const foreground = styleValue(element, "color");
    const background = styleValue(element, "background-color") ?? styleValue(element, "background");
    const styles = foreground || background || numericStyle(element, "font-size") || numericStyle(element, "font-weight") ? { ...(foreground ? { foreground } : {}), ...(background ? { background } : {}), ...(numericStyle(element, "font-size") ? { fontSizePx: numericStyle(element, "font-size") } : {}), ...(numericStyle(element, "font-weight") ? { fontWeight: numericStyle(element, "font-weight") } : {}) } : undefined;
    return { id: safeElementId(element, tag, index, seen), tag, role: element.getAttribute("role") ?? undefined, text, accessibleName: accessibleName(element, document), href, visible: !hidden, region, rect: { left, top, right: left + width, bottom: top + height }, styles };
  });
  const title = compactText(document.title, 240);
  dom.window.close();
  return { pageUrl, viewport, elements, source: "server_html", fetchedAt: nowIso(now), httpStatus: fetched.status, contentType: fetched.contentType, bytes: fetched.bytes, title, previewHtml: sanitizeLivePreviewHtml(html, pageUrl) };
}

function emit(job: LiveScanJob, phase: LiveScanPhase, progress: number, message: string, now: () => Date = () => new Date()): void {
  const event: LiveScanEvent = { id: job.events.length + 1, phase, progress, message, at: nowIso(now) };
  job.events.push(event);
  job.updatedAt = event.at;
  for (const listener of job.listeners) listener(event);
}

export function serializeLiveScanJob(job: LiveScanJob): Omit<LiveScanJob, "listeners"> {
  return { id: job.id, target: job.target, status: job.status, createdAt: job.createdAt, updatedAt: job.updatedAt, events: job.events, result: job.result, error: job.error };
}

export async function startLiveScan(context: ApiContext, input: unknown, dependencies: LiveSiteDependencies = {}): Promise<ReturnType<typeof serializeLiveScanJob>> {
  const target = liveScanRequestSchema.parse(input);
  const parsedUrl = await validateLiveSiteUrl(target.pageUrl, { lookup: dependencies.lookup });
  const state = await readState(context);
  if (!state.sites.some((site) => site.id === target.siteId)) throw notFound("Site", target.siteId);
  if (target.scanPolicy.denyPaths.some((path) => parsedUrl.pathname.startsWith(path)) || !target.scanPolicy.allowPaths.some((path) => parsedUrl.pathname.startsWith(path))) throw new ApiError(403, "LIVE_PATH_BLOCKED", "The target path is outside the site's scan policy.");
  const now = nowIso(dependencies.now);
  const job: LiveScanJob = { id: `live_${randomUUID().replaceAll("-", "").slice(0, 16)}`, target, status: "queued", createdAt: now, updatedAt: now, events: [], result: null, error: null, listeners: new Set() };
  context.liveScanJobs.set(job.id, job);
  emit(job, "queued", 0, "Scan accepted. PATCHWORK is preparing a safe public-page inspection.", dependencies.now);
  void executeLiveScan(context, job, dependencies);
  return serializeLiveScanJob(job);
}

export async function executeLiveScan(context: ApiContext, job: LiveScanJob, dependencies: LiveSiteDependencies = {}): Promise<void> {
  const now = dependencies.now;
  job.status = "running";
  emit(job, "validating", 10, "Validating the origin and scan policy.", now);
  try {
    emit(job, "fetching", 28, "Fetching bounded HTML without executing page scripts.", now);
    const fetched = await fetchLivePage(job.target.pageUrl, { fetcher: dependencies.fetcher, lookup: dependencies.lookup, maxBytes: job.target.scanPolicy.maxBytes, timeoutMs: job.target.scanPolicy.timeoutMs });
    emit(job, "parsing", 52, `Parsed ${Math.round(fetched.bytes / 1_000)} KB from ${new URL(fetched.finalUrl).hostname}.`, now);
    const snapshot = extractLiveSnapshot(fetched.html, fetched.finalUrl, job.target.viewport, fetched, now);
    emit(job, "analyzing", 72, `Checking ${snapshot.elements.length} visible and interactive elements.`, now);
    const scan = await runScan(context, { siteId: job.target.siteId, pageUrl: fetched.finalUrl, snapshot: { pageUrl: snapshot.pageUrl, viewport: snapshot.viewport, elements: snapshot.elements } });
    const state = await readState(context);
    const target = liveSiteTargetSchema.parse({ siteId: job.target.siteId, pageUrl: job.target.pageUrl, ownership: job.target.ownership, runtime: job.target.runtime, scanPolicy: job.target.scanPolicy });
    job.result = { target, snapshot, scan, findings: state.findings.filter((finding) => scan.findingIds.includes(finding.id)) };
    job.status = "completed";
    emit(job, "completed", 100, job.result.findings.length === 0 ? "The page is clear across the supported server-side detectors." : `${job.result.findings.length} finding${job.result.findings.length === 1 ? "" : "s"} need review before a patch can be proposed.`, now);
  } catch (error) {
    job.status = "failed";
    job.error = error instanceof ApiError ? error.message : "PATCHWORK could not complete the live-page scan safely.";
    emit(job, "failed", 100, job.error, now);
  }
}

export function getLiveScanJob(context: ApiContext, jobId: string): LiveScanJob {
  const job = context.liveScanJobs.get(jobId);
  if (!job) throw notFound("Live scan", jobId);
  return job;
}

export function subscribeLiveScan(job: LiveScanJob, listener: (event: LiveScanEvent) => void): () => void {
  job.listeners.add(listener);
  return () => job.listeners.delete(listener);
}

export function liveScanSse(event: LiveScanEvent): string {
  return `id: ${event.id}\nevent: ${event.phase}\ndata: ${JSON.stringify(event)}\n\n`;
}
