import type { PatchOperation } from "../../core/src/operations";

export interface DraftState {
  readonly operations: readonly PatchOperation[];
  readonly previewOnly: boolean;
  readonly canUndo: boolean;
  readonly canRedo: boolean;
}

interface MutationRecord {
  operation: PatchOperation;
  undo: () => void;
}

export function safeAttributeValue(name: string, value: string, origin: string): boolean {
  if (name === "href") {
    try {
      const url = new URL(value, origin);
      const base = new URL(origin);
      return url.origin === base.origin && !url.username && !url.password && !/^javascript:|^data:|^vbscript:/i.test(value);
    } catch {
      return false;
    }
  }
  return !/^on[a-z]+$/i.test(name) && !/<|>/.test(value);
}

export class DraftEditor {
  private readonly origin: string;
  private readonly undoStack: MutationRecord[][] = [];
  private readonly redoStack: MutationRecord[][] = [];
  private operations: PatchOperation[] = [];
  private previewOnly = true;

  constructor(origin: string) {
    this.origin = origin;
  }

  get state(): DraftState {
    return { operations: [...this.operations], previewOnly: this.previewOnly, canUndo: this.undoStack.length > 0, canRedo: this.redoStack.length > 0 };
  }

  setPreviewOnly(previewOnly: boolean): void {
    this.previewOnly = previewOnly;
  }

  apply(element: Element, operation: PatchOperation): void {
    if (operation.kind === "attribute" && !safeAttributeValue(operation.name, operation.value, this.origin)) throw new Error("This attribute value is unsafe or leaves the connected site origin.");
    const undo = this.mutate(element, operation);
    this.undoStack.push([{ operation, undo }]);
    this.redoStack.length = 0;
    this.operations.push(operation);
  }

  undo(): boolean {
    const record = this.undoStack.pop();
    if (!record) return false;
    for (const mutation of [...record].reverse()) mutation.undo();
    this.redoStack.push(record);
    this.operations = this.operations.filter((operation) => !record.some((mutation) => mutation.operation.id === operation.id));
    return true;
  }

  redo(elementLookup: (operation: PatchOperation) => Element | null): boolean {
    const record = this.redoStack.pop();
    if (!record) return false;
    const reapplied: MutationRecord[] = [];
    for (const mutation of record) {
      const element = elementLookup(mutation.operation);
      if (!element) {
        this.redoStack.push(record);
        return false;
      }
      reapplied.push({ operation: mutation.operation, undo: this.mutate(element, mutation.operation) });
      this.operations.push(mutation.operation);
    }
    this.undoStack.push(reapplied);
    return true;
  }

  reorder(element: Element, sibling: Element, operation: Extract<PatchOperation, { kind: "reorder" }>): void {
    if (!element.parentElement || element.parentElement !== sibling.parentElement) throw new Error("Reordering is limited to one parent container.");
    this.apply(element, operation);
  }

  clear(): void {
    this.operations = [];
    this.undoStack.length = 0;
    this.redoStack.length = 0;
  }

  private mutate(element: Element, operation: PatchOperation): () => void {
    if (operation.kind === "style") {
      const style = (element as HTMLElement).style;
      const property = operation.property.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
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
      if (!parent) throw new Error("The target has no parent container.");
      const previousNext = element.nextElementSibling;
      if (operation.direction === "before") parent.insertBefore(element, siblingForReorder(parent)); else parent.appendChild(element);
      return () => { if (previousNext) parent.insertBefore(element, previousNext); else parent.appendChild(element); };
    }
    const badge = document.createElement("span");
    badge.dataset.patchworkBadge = operation.id;
    badge.textContent = operation.label;
    badge.className = `patchwork-badge patchwork-badge-${operation.tone}`;
    element.appendChild(badge);
    return () => badge.remove();
  }
}

function siblingForReorder(parent: Element): Element {
  const first = parent.firstElementChild;
  if (!first) throw new Error("The target parent has no children.");
  return first;
}
