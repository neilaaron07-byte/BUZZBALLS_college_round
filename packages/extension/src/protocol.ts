import type { SemanticFingerprint } from "../../core/src/fingerprint";
import type { SignalBreakdown } from "../../core/src/resolver";
import type { PatchOperation } from "../../core/src/operations";

export const EXTENSION_PROTOCOL_VERSION = 1 as const;

export type ExtensionState = "idle" | "inspecting" | "selected" | "offline" | "unsafe" | "cross-origin" | "disappeared";

export interface TargetPreview {
  fingerprint: string;
  evidence: SemanticFingerprint;
  tag: string;
  label: string;
  breadcrumb: readonly string[];
  warnings: readonly string[];
}

export interface ResolverPreview {
  confidence: number;
  outcome: "exact" | "moved" | "ambiguous" | "missing";
  reason: string;
  signals: readonly SignalBreakdown[];
}

export interface HandshakeRequest {
  type: "handshake";
  protocolVersion: typeof EXTENSION_PROTOCOL_VERSION;
  tabId: number | null;
  origin: string;
}

export interface HandshakeResponse {
  type: "handshake_ack";
  protocolVersion: typeof EXTENSION_PROTOCOL_VERSION;
  connected: boolean;
  workspaceUrl: string;
  state: ExtensionState;
  message: string;
}

export interface DraftAction {
  type: "save_draft" | "open_dashboard" | "preview_privately";
  draftId: string;
  operations: readonly PatchOperation[];
}

export type ExtensionMessage = HandshakeRequest | DraftAction;
