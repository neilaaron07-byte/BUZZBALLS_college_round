import { previewTarget, snapshotElement } from "./target";
import type { TargetPreview } from "./protocol";

export interface InspectorCallbacks {
  onHover: (element: Element | null) => void;
  onSelect: (preview: TargetPreview) => void;
  onState: (state: "inspecting" | "selected" | "idle") => void;
}

export class InspectorController {
  private readonly document: Document;
  private readonly callbacks: InspectorCallbacks;
  private hovered: Element | null = null;
  private overlay: HTMLDivElement | null = null;
  private started = false;

  constructor(documentRef: Document, callbacks: InspectorCallbacks) {
    this.document = documentRef;
    this.callbacks = callbacks;
  }

  start(): void {
    if (this.started) return;
    this.started = true;
    this.document.addEventListener("pointerover", this.onPointerOver, true);
    this.document.addEventListener("pointerout", this.onPointerOut, true);
    this.document.addEventListener("click", this.onClick, true);
    this.document.addEventListener("keydown", this.onKeyDown, true);
    this.callbacks.onState("inspecting");
  }

  stop(): void {
    if (!this.started) return;
    this.started = false;
    this.document.removeEventListener("pointerover", this.onPointerOver, true);
    this.document.removeEventListener("pointerout", this.onPointerOut, true);
    this.document.removeEventListener("click", this.onClick, true);
    this.document.removeEventListener("keydown", this.onKeyDown, true);
    this.clearOverlay();
    this.callbacks.onState("idle");
  }

  selectParent(): void {
    if (this.hovered?.parentElement) this.setHovered(this.hovered.parentElement);
  }

  selectChild(): void {
    const child = this.hovered?.firstElementChild;
    if (child) this.setHovered(child);
  }

  private readonly onPointerOver = (event: Event): void => {
    const target = event.target;
    const ElementConstructor = this.document.defaultView?.Element;
    if (!ElementConstructor || !(target instanceof ElementConstructor) || target.closest("[data-patchwork-ui]")) return;
    this.setHovered(target);
  };

  private readonly onPointerOut = (event: Event): void => {
    const related = (event as PointerEvent).relatedTarget;
    const ElementConstructor = this.document.defaultView?.Element;
    if (!ElementConstructor || !(related instanceof ElementConstructor) || !this.hovered?.contains(related)) this.clearOverlay();
  };

  private readonly onClick = (event: Event): void => {
    const target = event.target;
    const ElementConstructor = this.document.defaultView?.Element;
    if (!ElementConstructor || !(target instanceof ElementConstructor) || target.closest("[data-patchwork-ui]")) return;
    event.preventDefault();
    event.stopPropagation();
    void previewTarget(target).then((preview) => {
      this.callbacks.onSelect(preview);
      this.callbacks.onState("selected");
    });
  };

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    if (event.key === "Escape") {
      this.clearOverlay();
      this.callbacks.onState("inspecting");
    }
    if (event.key === "Enter" && this.hovered) {
      event.preventDefault();
      void previewTarget(this.hovered).then((preview) => this.callbacks.onSelect(preview));
    }
  };

  private setHovered(element: Element): void {
    this.hovered = element;
    this.callbacks.onHover(element);
    this.renderOverlay(element);
  }

  private renderOverlay(element: Element): void {
    if (!this.overlay) {
      this.overlay = this.document.createElement("div");
      this.overlay.dataset.patchworkUi = "highlight";
      Object.assign(this.overlay.style, { position: "fixed", pointerEvents: "none", zIndex: "2147483646", border: "1px solid #9eff3f", background: "rgba(158,255,63,.08)", transition: "all 120ms ease" });
      this.document.documentElement.appendChild(this.overlay);
    }
    const rect = element.getBoundingClientRect();
    Object.assign(this.overlay.style, { top: `${rect.top}px`, left: `${rect.left}px`, width: `${rect.width}px`, height: `${rect.height}px`, display: "block" });
  }

  private clearOverlay(): void {
    this.overlay?.remove();
    this.overlay = null;
    this.hovered = null;
    this.callbacks.onHover(null);
  }
}

export function elementSummary(element: Element): string {
  const snapshot = snapshotElement(element);
  return `${snapshot.tag} ${snapshot.attributes["data-testid"] ?? snapshot.attributes.id ?? "anonymous target"}`;
}
