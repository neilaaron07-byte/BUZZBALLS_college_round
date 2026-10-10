import { EXTENSION_PROTOCOL_VERSION, type DraftAction, type HandshakeRequest, type HandshakeResponse } from "./protocol";

export interface RuntimePort {
  postMessage(message: unknown): void;
  disconnect(): void;
  onMessage: { addListener(listener: (message: unknown) => void): void };
  onDisconnect: { addListener(listener: () => void): void };
}

export interface ExtensionRuntime {
  connect(options: { name: string }): RuntimePort;
  getURL(path: string): string;
}

export interface ConnectionConfig {
  runtime: ExtensionRuntime;
  apiOrigin: string;
  tabId: number | null;
  pageOrigin: string;
}

export class ExtensionConnection {
  private readonly config: ConnectionConfig;
  private port: RuntimePort | null = null;
  private connected = false;

  constructor(config: ConnectionConfig) {
    this.config = config;
  }

  async handshake(): Promise<HandshakeResponse> {
    const request: HandshakeRequest = { type: "handshake", protocolVersion: EXTENSION_PROTOCOL_VERSION, tabId: this.config.tabId, origin: this.config.pageOrigin };
    this.port = this.config.runtime.connect({ name: "patchwork-content" });
    return new Promise<HandshakeResponse>((resolve) => {
      const timeout = globalThis.setTimeout(() => resolve({ type: "handshake_ack", protocolVersion: EXTENSION_PROTOCOL_VERSION, connected: false, workspaceUrl: this.config.apiOrigin, state: "offline", message: "PATCHWORK could not reach the workspace; drafts stay local." }), 1_500);
      this.port?.onMessage.addListener((message) => {
        if (!message || typeof message !== "object" || (message as { type?: unknown }).type !== "handshake_ack") return;
        globalThis.clearTimeout(timeout);
        this.connected = (message as HandshakeResponse).connected;
        resolve(message as HandshakeResponse);
      });
      this.port?.onDisconnect.addListener(() => { this.connected = false; });
      this.port?.postMessage(request);
    });
  }

  get isConnected(): boolean {
    return this.connected;
  }

  send(action: DraftAction): boolean {
    if (!this.port || !this.connected) return false;
    this.port.postMessage(action);
    return true;
  }

  disconnect(): void {
    this.port?.disconnect();
    this.port = null;
    this.connected = false;
  }
}
