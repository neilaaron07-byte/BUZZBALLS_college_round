import { canonicalJson, sha256 } from "./canonical";
import type { Manifest } from "./schemas";

export class ManifestIntegrityError extends Error {
  readonly code: "SIGNATURE_INVALID" | "MANIFEST_EXPIRED" | "MANIFEST_REPLAY" | "SITE_MISMATCH" | "ENVIRONMENT_MISMATCH" | "KILL_SWITCH";

  constructor(code: ManifestIntegrityError["code"], message: string) {
    super(message);
    this.name = "ManifestIntegrityError";
    this.code = code;
  }
}

function base64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(value: string): Uint8Array {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

export async function signManifest(manifest: Manifest, privateKey: CryptoKey): Promise<string> {
  const signature = await globalThis.crypto.subtle.sign({ name: "Ed25519" }, privateKey, new TextEncoder().encode(canonicalJson(manifest)));
  return base64Url(new Uint8Array(signature));
}

export async function verifyManifestSignature(manifest: Manifest, signature: string, publicKey: CryptoKey): Promise<boolean> {
  try {
    const signatureBytes = fromBase64Url(signature);
    const signatureBuffer = new ArrayBuffer(signatureBytes.byteLength);
    new Uint8Array(signatureBuffer).set(signatureBytes);
    return await globalThis.crypto.subtle.verify({ name: "Ed25519" }, publicKey, signatureBuffer, new TextEncoder().encode(canonicalJson(manifest)));
  } catch {
    return false;
  }
}

export interface ManifestAcceptanceContext {
  siteId: string;
  environment: Manifest["environment"];
  now: Date;
  acceptedReleaseIds: readonly string[];
}

export function assertManifestAcceptable(manifest: Manifest, context: ManifestAcceptanceContext): void {
  if (manifest.siteId !== context.siteId) throw new ManifestIntegrityError("SITE_MISMATCH", "This manifest belongs to a different site.");
  if (manifest.environment !== context.environment) throw new ManifestIntegrityError("ENVIRONMENT_MISMATCH", "This manifest is for a different environment.");
  if (manifest.killSwitch.enabled) throw new ManifestIntegrityError("KILL_SWITCH", "The release is disabled by its kill switch.");
  const now = context.now.getTime();
  if (new Date(manifest.expiresAt).getTime() <= now) throw new ManifestIntegrityError("MANIFEST_EXPIRED", "This manifest has expired and cannot be applied safely.");
  if (context.acceptedReleaseIds.includes(manifest.releaseId)) throw new ManifestIntegrityError("MANIFEST_REPLAY", "This release has already been accepted; refusing a replay.");
}

export async function manifestContentHash(manifest: Manifest): Promise<`sha256-${string}`> {
  return sha256(canonicalJson(manifest));
}
