import { renderPanel } from "./sidepanel";

const container = typeof document === "undefined" ? null : document.querySelector<HTMLElement>("#patchwork-panel");
if (container) {
  let message = "Hover a page element and click to start a safe draft.";
  const render = (state: "idle" | "inspecting" | "selected" | "offline" | "unsafe" | "cross-origin" | "disappeared" = "idle") => renderPanel(container, { state, target: null, resolver: null, draftCount: 0, message }, {
    onUndo: () => { message = "Nothing to undo yet; select a target first."; render("idle"); },
    onSave: () => { message = "Select a target and create an operation before saving."; render("idle"); },
    onDashboard: () => { message = "Open the PATCHWORK workspace to review a draft."; globalThis.open?.("https://patchwork.local/dashboard", "_blank", "noopener"); render("idle"); },
    onPreview: () => { message = "Preview becomes available after a draft is saved."; render("idle"); },
  });
  render();
}
