import { InspectorController } from "./inspector";

export function startContentInspector(documentRef: Document = document): InspectorController {
  const controller = new InspectorController(documentRef, {
    onHover: () => undefined,
    onSelect: () => undefined,
    onState: () => undefined,
  });
  controller.start();
  return controller;
}

if (typeof document !== "undefined" && !document.documentElement.dataset.patchworkLoaded) {
  document.documentElement.dataset.patchworkLoaded = "true";
  startContentInspector();
}
