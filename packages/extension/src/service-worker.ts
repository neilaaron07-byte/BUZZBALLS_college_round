import { EXTENSION_PROTOCOL_VERSION, type HandshakeRequest, type HandshakeResponse } from "./protocol";

export interface ServiceWorkerPort {
  name: string;
  postMessage(message: unknown): void;
  onMessage: { addListener(listener: (message: unknown, port: ServiceWorkerPort) => void): void };
}

export function handleConnection(port: ServiceWorkerPort, apiOrigin = "https://patchwork.local"): void {
  port.onMessage.addListener((message) => {
    if (!message || typeof message !== "object" || (message as { type?: unknown }).type !== "handshake") return;
    const request = message as HandshakeRequest;
    const response: HandshakeResponse = {
      type: "handshake_ack",
      protocolVersion: EXTENSION_PROTOCOL_VERSION,
      connected: request.protocolVersion === EXTENSION_PROTOCOL_VERSION,
      workspaceUrl: apiOrigin,
      state: request.protocolVersion === EXTENSION_PROTOCOL_VERSION ? "inspecting" : "offline",
      message: request.protocolVersion === EXTENSION_PROTOCOL_VERSION ? "Connected to PATCHWORK workspace." : "This extension needs an update before it can connect.",
    };
    port.postMessage(response);
  });
}

declare const chrome: { runtime?: { onConnect?: { addListener(listener: (port: ServiceWorkerPort) => void): void } } } | undefined;
if (typeof chrome !== "undefined") chrome.runtime?.onConnect?.addListener((port) => handleConnection(port));
