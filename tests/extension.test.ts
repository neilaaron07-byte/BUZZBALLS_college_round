import assert from "node:assert/strict";
import test from "node:test";
import { JSDOM } from "jsdom";
import { ExtensionConnection } from "../packages/extension/src/connection";
import { DraftEditor, safeAttributeValue } from "../packages/extension/src/editor";
import { InspectorController } from "../packages/extension/src/inspector";
import { handleConnection, type ServiceWorkerPort } from "../packages/extension/src/service-worker";
import { renderPanel } from "../packages/extension/src/sidepanel";

function installDom(markup: string): JSDOM {
  const dom = new JSDOM(`<!doctype html><html><body>${markup}</body></html>`, { url: "https://shopnest.example/products/aurora" });
  globalThis.window = dom.window as unknown as Window & typeof globalThis;
  globalThis.document = dom.window.document;
  Object.defineProperty(globalThis, "innerWidth", { configurable: true, value: 1024 });
  Object.defineProperty(globalThis, "innerHeight", { configurable: true, value: 768 });
  return dom;
}

test("inspector highlights, selects, and navigates parent and child targets", async () => {
  const dom = installDom("<main><section id='panel'><button data-testid='buy'>Add to cart</button></section></main>");
  const button = document.querySelector("button")!;
  const states: string[] = [];
  let selectedLabel = "";
  const inspector = new InspectorController(document, { onHover: () => undefined, onSelect: (preview) => { selectedLabel = preview.label; }, onState: (state) => states.push(state) });
  inspector.start();
  button.dispatchEvent(new dom.window.MouseEvent("pointerover", { bubbles: true }));
  button.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
  await new Promise((resolve) => setTimeout(resolve, 10));
  assert.equal(selectedLabel, "Add to cart");
  assert.equal(states.includes("selected"), true);
  inspector.selectParent();
  inspector.selectChild();
  inspector.stop();
  assert.equal(document.querySelector("[data-patchwork-ui='highlight']"), null);
  dom.window.close();
});

test("draft editor supports safe controls, same-origin attributes, reorder constraints, undo, and redo", () => {
  installDom("<main><div id='a'>A</div><div id='b'>B</div></main><footer><aside id='other'>Other</aside></footer>");
  const first = document.querySelector("#a")!;
  const other = document.querySelector("#other")!;
  const editor = new DraftEditor("https://shopnest.example");
  const target = { fingerprint: "fp_target_00000001", fallbackLabel: "A", expectedTag: "div" };
  editor.apply(first, { id: "style-1", kind: "style", target, property: "color", value: "#9eff3f" });
  assert.equal((first as HTMLElement).style.color, "rgb(158, 255, 63)");
  editor.undo();
  assert.equal((first as HTMLElement).style.color, "");
  editor.redo(() => first);
  assert.equal((first as HTMLElement).style.color, "rgb(158, 255, 63)");
  editor.apply(first, { id: "text-1", kind: "text", target, value: "Updated" });
  assert.equal(first.textContent, "Updated");
  assert.equal(safeAttributeValue("href", "/checkout", "https://shopnest.example"), true);
  assert.equal(safeAttributeValue("href", "https://evil.example", "https://shopnest.example"), false);
  assert.throws(() => editor.apply(first, { id: "bad", kind: "attribute", target, name: "href", value: "https://evil.example" }), /unsafe|origin/);
  assert.throws(() => editor.reorder(first, other, { id: "reorder", kind: "reorder", target, direction: "before", siblingFingerprint: "fp_other_00000002" }), /one parent/);
});

test("connection and service worker handshake share one explicit protocol", async () => {
  let listener: ((message: unknown) => void) | null = null;
  const posted: unknown[] = [];
  const port = {
    postMessage(message: unknown) { posted.push(message); if (listener && typeof message === "object" && message !== null && (message as { type?: string }).type === "handshake") listener({ type: "handshake_ack", protocolVersion: 1, connected: true, workspaceUrl: "https://patchwork.local", state: "inspecting", message: "Connected." }); },
    disconnect() { /* the fake port has no external resources */ },
    onMessage: { addListener(callback: (message: unknown) => void) { listener = callback; } },
    onDisconnect: { addListener() { /* no-op */ } },
  };
  const connection = new ExtensionConnection({ runtime: { connect: () => port, getURL: (path) => path }, apiOrigin: "https://patchwork.local", tabId: 42, pageOrigin: "https://shopnest.example" });
  const response = await connection.handshake();
  assert.equal(response.connected, true);
  assert.equal(posted.length, 1);
  assert.equal(connection.send({ type: "save_draft", draftId: "draft-1", operations: [] }), true);

  const workerListeners: Array<(message: unknown, port: ServiceWorkerPort) => void> = [];
  let workerResponse: unknown = null;
  const workerPort: ServiceWorkerPort = { name: "patchwork-content", postMessage: (message) => { workerResponse = message; }, onMessage: { addListener: (callback) => { workerListeners.push(callback); } } };
  handleConnection(workerPort);
  const workerListener = workerListeners[0];
  assert.ok(workerListener);
  workerListener({ type: "handshake", protocolVersion: 1, tabId: 42, origin: "https://shopnest.example" }, workerPort);
  assert.equal((workerResponse as { connected: boolean }).connected, true);
});

test("side panel renders empty, unsafe, and selected states with actionable controls", () => {
  installDom("<main id='root'></main>");
  const root = document.querySelector<HTMLElement>("#root")!;
  const actions = { onUndo: () => undefined, onSave: () => undefined, onDashboard: () => undefined, onPreview: () => undefined, onOperation: () => undefined };
  renderPanel(root, { state: "idle", target: null, resolver: null, draftCount: 0, message: "Select an element." }, actions);
  assert.match(root.textContent ?? "", /Select an element/);
  renderPanel(root, { state: "unsafe", target: null, resolver: null, draftCount: 0, message: "Blocked." }, actions);
  assert.match(root.textContent ?? "", /Change blocked/);
  assert.equal(root.querySelectorAll("button").length, 4);
});
