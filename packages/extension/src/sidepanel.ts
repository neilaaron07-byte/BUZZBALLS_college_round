import type { PatchOperation } from "../../core/src/operations";
import type { ExtensionState, ResolverPreview, TargetPreview } from "./protocol";

export interface PanelModel {
  state: ExtensionState;
  target: TargetPreview | null;
  resolver: ResolverPreview | null;
  draftCount: number;
  message: string;
}

export function confidenceLabel(value: number): string {
  if (value >= 0.9) return "High confidence";
  if (value >= 0.72) return "Review recommended";
  return "Blocked for safety";
}

export function renderPanel(container: HTMLElement, model: PanelModel, actions: { onUndo: () => void; onSave: () => void; onDashboard: () => void; onPreview: () => void; onOperation?: (operation: PatchOperation) => void }): void {
  container.replaceChildren();
  container.dataset.patchworkUi = "panel";
  const root = document.createElement("section");
  root.className = "patchwork-extension-panel";
  root.innerHTML = `<header><strong>PATCHWORK</strong><span aria-label="Current state">${model.state}</span></header><p class="panel-message"></p>`;
  const message = root.querySelector(".panel-message");
  if (message) message.textContent = model.message;
  const live = document.createElement("div");
  live.setAttribute("aria-live", "polite");
  live.className = "panel-live";
  live.textContent = model.message;
  root.appendChild(live);
  if (model.target) {
    const target = document.createElement("article");
    target.className = "target-card";
    const warningText = model.target.warnings.length > 0 ? `<ul>${model.target.warnings.map((warning) => `<li>${warning}</li>`).join("")}</ul>` : "<p>Stable signals found.</p>";
    target.innerHTML = `<small>SELECTED TARGET</small><h2></h2><code></code><p>${model.target.breadcrumb.join(" › ")}</p>${warningText}`;
    target.querySelector("h2")!.textContent = model.target.label;
    target.querySelector("code")!.textContent = model.target.fingerprint;
    root.appendChild(target);
    root.appendChild(renderVisualControls(model.target, actions.onOperation));
  } else if (model.state === "idle") {
    root.appendChild(stateCard("Select an element", "Hover a page element and click to start a safe draft."));
  } else if (model.state === "offline") {
    root.appendChild(stateCard("Workspace offline", "The inspector still works locally; save stays disabled until the workspace reconnects."));
  } else if (model.state === "unsafe") {
    root.appendChild(stateCard("Change blocked", "This value is unsafe or outside the connected site origin."));
  } else if (model.state === "cross-origin") {
    root.appendChild(stateCard("Cross-origin link blocked", "PATCHWORK only edits links on the connected site origin."));
  } else if (model.state === "disappeared") {
    root.appendChild(stateCard("Target disappeared", "The page changed before the draft was saved. Select the target again."));
  }
  if (model.resolver) {
    const resolver = document.createElement("section");
    resolver.className = "resolver-card";
    resolver.innerHTML = `<small>RESOLVER</small><strong>${confidenceLabel(model.resolver.confidence)}</strong><p></p><div class="signal-list"></div>`;
    resolver.querySelector("p")!.textContent = model.resolver.reason;
    const list = resolver.querySelector(".signal-list")!;
    for (const signal of model.resolver.signals) {
      const row = document.createElement("div");
      row.innerHTML = `<span>${signal.signal}</span><meter min="0" max="1" value="${signal.score}"></meter><output>${Math.round(signal.score * 100)}%</output>`;
      list.appendChild(row);
    }
    root.appendChild(resolver);
  }
  const actionsRow = document.createElement("footer");
  actionsRow.innerHTML = `<button type="button" data-action="undo">Undo</button><button type="button" data-action="save">Save draft</button><button type="button" data-action="dashboard">Open dashboard</button><button type="button" data-action="preview">Preview privately</button>`;
  actionsRow.querySelector('[data-action="undo"]')?.addEventListener("click", actions.onUndo);
  actionsRow.querySelector('[data-action="save"]')?.addEventListener("click", actions.onSave);
  actionsRow.querySelector('[data-action="dashboard"]')?.addEventListener("click", actions.onDashboard);
  actionsRow.querySelector('[data-action="preview"]')?.addEventListener("click", actions.onPreview);
  root.appendChild(actionsRow);
  container.appendChild(root);
}

function renderVisualControls(target: TargetPreview, onOperation?: (operation: PatchOperation) => void): HTMLElement {
  const section = document.createElement("section");
  section.className = "visual-controls";
  section.innerHTML = `<small>FIX IN PREVIEW</small><label>Text<input data-control="text" type="text" value="${escapeAttribute(target.label)}"></label><label>Color<input data-control="color" type="color" value="#9eff3f"></label><label>Font size<input data-control="fontSize" type="text" value="16px"></label><label>Spacing<input data-control="padding" type="text" value="12px"></label><label class="control-check"><input data-control="hidden" type="checkbox"> Hide target</label><button type="button" data-control="apply">Apply preview change</button>`;
  const operationTarget = {
    fingerprint: target.fingerprint,
    fallbackLabel: target.label,
    expectedTag: target.tag,
    expectedRole: target.evidence.visualRole,
    evidence: {
      ...target.evidence,
      attributes: { ...target.evidence.attributes, meaningfulClasses: [...target.evidence.attributes.meaningfulClasses] },
      textTokens: [...target.evidence.textTokens],
      textNgrams: [...target.evidence.textNgrams],
      path: [...target.evidence.path],
      siblingSignature: [...target.evidence.siblingSignature],
      landmarkChain: [...target.evidence.landmarkChain],
    },
  };
  section.querySelector('[data-control="apply"]')?.addEventListener("click", () => {
    const text = section.querySelector<HTMLInputElement>('[data-control="text"]')?.value ?? target.label;
    const hidden = section.querySelector<HTMLInputElement>('[data-control="hidden"]')?.checked ?? false;
    onOperation?.({ id: `draft-${Date.now()}`, kind: "text", target: operationTarget, value: text });
    onOperation?.({ id: `draft-style-${Date.now()}`, kind: "style", target: operationTarget, property: "color", value: section.querySelector<HTMLInputElement>('[data-control="color"]')?.value ?? "#9eff3f" });
    onOperation?.({ id: `draft-type-${Date.now()}`, kind: "style", target: operationTarget, property: "fontSize", value: section.querySelector<HTMLInputElement>('[data-control="fontSize"]')?.value ?? "16px" });
    onOperation?.({ id: `draft-space-${Date.now()}`, kind: "style", target: operationTarget, property: "padding", value: section.querySelector<HTMLInputElement>('[data-control="padding"]')?.value ?? "12px" });
    onOperation?.({ id: `draft-hidden-${Date.now()}`, kind: "hide", target: operationTarget, hidden });
  });
  return section;
}

function escapeAttribute(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function stateCard(title: string, message: string): HTMLElement {
  const card = document.createElement("article");
  card.className = "state-card";
  card.innerHTML = `<strong></strong><p></p>`;
  card.querySelector("strong")!.textContent = title;
  card.querySelector("p")!.textContent = message;
  return card;
}
