import { assertManifestAcceptable, verifyManifestSignature } from "../../core/src/integrity";
import { fingerprintFromSnapshot, inferVisualRole, type ElementSnapshot } from "../../core/src/fingerprint";
import { resolveTarget } from "../../core/src/resolver";
import type { Manifest } from "../../core/src/schemas";
import type { Patch } from "../../core/src/patches";
import type { PatchOperation } from "../../core/src/operations";
import { ManifestCache, type CachedManifest } from "./cache";
import { TelemetryQueue } from "./telemetry";
import { validateManifest, validateOperation, validatePatch } from "./validation";
import type { SDKApplyFailure, SDKApplyResult, SDKConfig, SDKHealthEvent, SDKLifecycle, SignedManifestEnvelope } from "./types";

interface ResolvedElement {
  element: Element;
  id: string;
}

interface InverseMutation {
  operationId: string;
  undo: () => void;
}

function failure(patchId: string, code: SDKApplyFailure["code"], message: string, rolledBack = false): SDKApplyFailure {
  return { ok: false, patchId, code, message, rolledBack };
}

function cssName(property: string): string {
  return property.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
}

function nowIso(now: () => Date): string {
  return now().toISOString();
}

export class PatchworkSDK {
  private readonly config: SDKConfig;
  private readonly cache: ManifestCache;
  private readonly telemetry: TelemetryQueue;
  private readonly debounceMs: number;
  private readonly failureThreshold: number;
  private manifest: Manifest | null = null;
  private lifecycle: SDKLifecycle = "idle";
  private observer: MutationObserver | null = null;
  private observerTimer: ReturnType<typeof globalThis.setTimeout> | null = null;
  private applying = false;
  private circuitFailures = 0;
  private circuitOpen = false;
  private readonly activePatches: Patch[] = [];
  private readonly undoStack: InverseMutation[][] = [];

  private constructor(config: SDKConfig) {
    this.config = config;
    this.cache = new ManifestCache(config.siteId, config.environment, config.storage);
    this.telemetry = new TelemetryQueue(config.telemetryTransport);
    this.debounceMs = config.debounceMs ?? 120;
    this.failureThreshold = config.failureThreshold ?? 3;
  }

  static async init(config: SDKConfig): Promise<PatchworkSDK> {
    const sdk = new PatchworkSDK(config);
    await sdk.start();
    return sdk;
  }

  get status(): SDKLifecycle {
    return this.lifecycle;
  }

  get activeManifest(): Manifest | null {
    return this.manifest;
  }

  get telemetrySize(): number {
    return this.telemetry.size();
  }

  async start(): Promise<SDKLifecycle> {
    if (this.lifecycle === "ready") return this.lifecycle;
    this.lifecycle = "loading";
    const loaded = await this.loadManifest();
    if (!loaded) {
      this.lifecycle = "degraded";
      return this.lifecycle;
    }
    this.lifecycle = "ready";
    this.observe();
    return this.lifecycle;
  }

  stop(): void {
    if (this.observerTimer) globalThis.clearTimeout(this.observerTimer);
    this.observerTimer = null;
    this.observer?.disconnect();
    this.observer = null;
    this.activePatches.length = 0;
    this.lifecycle = "stopped";
  }

  async refreshManifest(): Promise<boolean> {
    return this.loadManifest();
  }

  async flushTelemetry(): Promise<boolean> {
    return this.telemetry.flush();
  }

  rollbackLast(): boolean {
    const inverse = this.undoStack.pop();
    if (!inverse) return false;
    this.applying = true;
    try {
      for (const mutation of inverse.reverse()) mutation.undo();
      return true;
    } finally {
      this.applying = false;
    }
  }

  resetCircuit(): void {
    this.circuitFailures = 0;
    this.circuitOpen = false;
    if (this.lifecycle === "degraded" && this.manifest) this.lifecycle = "ready";
  }

  async applyPatch(input: unknown): Promise<SDKApplyResult> {
    const patchId = typeof input === "object" && input !== null && "identity" in input && typeof input.identity === "object" && input.identity !== null && "id" in input.identity && typeof input.identity.id === "string" ? input.identity.id : "unknown-patch";
    if (this.circuitOpen) return failure(patchId, "CIRCUIT_OPEN", "PATCHWORK paused patch application after repeated failures; reset the circuit after review.");
    if (this.lifecycle !== "ready") return failure(patchId, "NOT_READY", "PATCHWORK is not ready with a verified manifest; the page was left unchanged.");
    let patch: Patch;
    try {
      patch = validatePatch(input);
    } catch (error) {
      return failure(patchId, "INVALID_PATCH", error instanceof Error ? error.message : "The patch shape is invalid; PATCHWORK left the page unchanged.");
    }
    let operations: readonly PatchOperation[];
    try {
      operations = patch.operations.map((operation) => validateOperation(operation, this.config.siteOrigin));
    } catch (error) {
      return failure(patch.identity.id, "UNSAFE_PATCH", error instanceof Error ? error.message : "The patch was rejected as unsafe.");
    }
    const inverse: InverseMutation[] = [];
    this.applying = true;
    try {
      for (const operation of operations) {
        const resolved = this.resolveOperation(operation);
        if (!resolved) {
          for (const mutation of inverse.reverse()) mutation.undo();
          this.recordFailure(`Target ${operation.target.fallbackLabel} could not be resolved safely.`);
          return failure(patch.identity.id, "TARGET_UNRESOLVED", `PATCHWORK could not resolve “${operation.target.fallbackLabel}” without risking the wrong element.`, true);
        }
        inverse.push({ operationId: operation.id, undo: this.applyOperation(operation, resolved.element) });
      }
      this.undoStack.push(inverse);
      if (!this.activePatches.some((active) => active.identity.id === patch.identity.id)) this.activePatches.push(patch);
      this.circuitFailures = 0;
      return { ok: true, patchId: patch.identity.id, appliedOperationIds: operations.map((operation) => operation.id), rolledBack: false };
    } catch (error) {
      for (const mutation of inverse.reverse()) mutation.undo();
      this.recordFailure(error instanceof Error ? error.message : "Patch application failed.");
      return failure(patch.identity.id, "APPLY_FAILED", "PATCHWORK rolled the patch back because the browser mutation failed.", true);
    } finally {
      this.applying = false;
    }
  }

  private async loadManifest(): Promise<boolean> {
    const fetchImpl = this.config.fetchImpl ?? globalThis.fetch;
    const cached = this.cache.read();
    try {
      const response = await fetchImpl(this.config.manifestUrl, { headers: { accept: "application/json" } });
      if (!response.ok) throw new Error(`Manifest request returned HTTP ${response.status}.`);
      const envelope = await response.json() as SignedManifestEnvelope;
      const manifest = validateManifest(envelope.manifest);
      const signature = typeof envelope.signature === "string" ? envelope.signature : "";
      if (!signature || !(await verifyManifestSignature(manifest, signature, this.config.publicKey))) throw new Error("The manifest signature could not be verified.");
      assertManifestAcceptable(manifest, { siteId: this.config.siteId, environment: this.config.environment, now: this.config.now?.() ?? new Date(), acceptedReleaseIds: [] });
      const verified: CachedManifest = { manifest, signature, verifiedAt: nowIso(this.config.now ?? (() => new Date())) };
      this.cache.write(verified);
      this.acceptManifest(verified);
      return true;
    } catch (error) {
      if (cached && await verifyManifestSignature(cached.manifest, cached.signature, this.config.publicKey)) {
        try {
          assertManifestAcceptable(cached.manifest, { siteId: this.config.siteId, environment: this.config.environment, now: this.config.now?.() ?? new Date(), acceptedReleaseIds: [] });
          this.acceptManifest(cached);
          this.recordHealth("healthy", 1, "Manifest endpoint unavailable; using the last verified manifest.");
          return true;
        } catch {
          // Fall through to the safe no-op state.
        }
      }
      this.recordHealth("critical", 0, error instanceof Error ? error.message : "Manifest verification failed; patches are disabled.");
      return false;
    }
  }

  private acceptManifest(cached: CachedManifest): void {
    this.manifest = cached.manifest;
  }

  private observe(): void {
    if (typeof MutationObserver === "undefined" || typeof document === "undefined" || this.observer) return;
    this.observer = new MutationObserver(() => {
      if (this.applying || this.activePatches.length === 0) return;
      if (this.observerTimer) globalThis.clearTimeout(this.observerTimer);
      this.observerTimer = globalThis.setTimeout(() => {
        void this.reapplyActivePatches();
      }, this.debounceMs);
    });
    this.observer.observe(document.documentElement, { subtree: true, childList: true, attributes: true, characterData: true });
  }

  private async reapplyActivePatches(): Promise<void> {
    const patches = [...this.activePatches];
    for (const patch of patches) await this.applyPatch(patch);
  }

  private resolveOperation(operation: PatchOperation): ResolvedElement | null {
    if (typeof document === "undefined" || !operation.target.evidence) return null;
    const elements = Array.from(document.querySelectorAll("*"));
    const candidates = elements.map((element, index) => ({
      id: `dom-${index}`,
      label: element.textContent?.trim().slice(0, 120) || element.tagName.toLowerCase(),
      fingerprint: fingerprintFromSnapshot(this.snapshotElement(element)),
    }));
    const result = resolveTarget(operation.target.evidence, candidates);
    if (!result.targetId) return null;
    const index = Number(result.targetId.replace("dom-", ""));
    const element = elements[index];
    if (!element || element.tagName.toLowerCase() !== operation.target.expectedTag) return null;
    if (operation.target.expectedRole && element.getAttribute("role") !== operation.target.expectedRole && inferVisualRole(this.snapshotElement(element)) !== operation.target.expectedRole) return null;
    return { element, id: result.targetId };
  }

  private snapshotElement(element: Element): ElementSnapshot {
    const attributes: Record<string, string> = {};
    for (const name of element.getAttributeNames()) {
      const value = element.getAttribute(name);
      if (value !== null) attributes[name] = value;
    }
    const path: string[] = [];
    let current: Element | null = element;
    while (current && path.length < 8) {
      path.unshift(current.tagName.toLowerCase());
      current = current.parentElement;
    }
    const rect = element.getBoundingClientRect();
    const viewportWidth = globalThis.innerWidth || document.documentElement.clientWidth || 1;
    const viewportHeight = globalThis.innerHeight || document.documentElement.clientHeight || 1;
    return {
      tag: element.tagName.toLowerCase(),
      attributes,
      text: element.textContent ?? "",
      path,
      siblings: Array.from(element.parentElement?.children ?? []).map((child) => child.tagName.toLowerCase()),
      landmarks: path.filter((tag) => ["main", "nav", "header", "footer", "section", "article", "aside"].includes(tag)),
      rect: { top: rect.top, left: rect.left, width: rect.width, height: rect.height, viewportWidth, viewportHeight },
      visualRole: inferVisualRole({ tag: element.tagName.toLowerCase(), attributes }),
    };
  }

  private applyOperation(operation: PatchOperation, element: Element): () => void {
    if (operation.kind === "style") {
      const style = (element as HTMLElement).style;
      const property = cssName(operation.property);
      const previous = style.getPropertyValue(property);
      style.setProperty(property, operation.value);
      return () => previous ? style.setProperty(property, previous) : style.removeProperty(property);
    }
    if (operation.kind === "text") {
      const previous = element.textContent ?? "";
      element.textContent = operation.value;
      return () => { element.textContent = previous; };
    }
    if (operation.kind === "attribute") {
      const previous = element.getAttribute(operation.name);
      element.setAttribute(operation.name, operation.value);
      return () => { if (previous === null) element.removeAttribute(operation.name); else element.setAttribute(operation.name, previous); };
    }
    if (operation.kind === "hide") {
      const style = (element as HTMLElement).style;
      const previous = style.getPropertyValue("display");
      if (operation.hidden) style.setProperty("display", "none"); else style.removeProperty("display");
      return () => { if (previous) style.setProperty("display", previous); else style.removeProperty("display"); };
    }
    if (operation.kind === "reorder") {
      const parent = element.parentElement;
      if (!parent) throw new Error("The target has no parent to reorder within.");
      const previousNext = element.nextElementSibling;
      if (operation.direction === "before") parent.insertBefore(element, parent.firstElementChild);
      else parent.appendChild(element);
      return () => { if (previousNext) parent.insertBefore(element, previousNext); else parent.appendChild(element); };
    }
    const badge = document.createElement("span");
    badge.dataset.patchworkBadge = operation.id;
    badge.className = `patchwork-badge patchwork-badge-${operation.tone}`;
    badge.textContent = operation.label;
    element.appendChild(badge);
    return () => badge.remove();
  }

  private recordFailure(explanation: string): void {
    this.circuitFailures += 1;
    if (this.circuitFailures >= this.failureThreshold) {
      this.circuitOpen = true;
      this.lifecycle = "degraded";
      this.recordHealth("critical", 0, "Patch application paused after repeated failures.");
    } else {
      this.recordHealth("degraded", 0, explanation);
    }
  }

  private recordHealth(status: SDKHealthEvent["status"], value: number, explanation: string): void {
    const event: SDKHealthEvent = {
      id: `sdk-health-${Date.now()}-${this.telemetry.size()}`,
      releaseId: this.manifest?.releaseId ?? "release-unknown",
      type: "browser_check",
      status,
      observedAt: nowIso(this.config.now ?? (() => new Date())),
      value,
      threshold: 1,
      explanation,
    };
    this.telemetry.add(event);
    this.config.onHealthEvent?.(event);
  }
}
