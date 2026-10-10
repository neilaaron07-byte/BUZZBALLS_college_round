import type { Manifest } from "../../core/src/index";
import type { SDKStorage } from "./types";
import { validateManifest } from "./validation";

export interface CachedManifest {
  manifest: Manifest;
  signature: string;
  verifiedAt: string;
}

export class ManifestCache {
  private readonly key: string;
  private readonly storage: SDKStorage | null;
  private memory: CachedManifest | null = null;

  constructor(siteId: string, environment: string, storage?: SDKStorage) {
    this.key = `patchwork:manifest:${siteId}:${environment}`;
    this.storage = storage ?? null;
  }

  read(): CachedManifest | null {
    const raw = this.storage?.getItem(this.key);
    if (!raw) return this.memory;
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (!parsed || typeof parsed !== "object") return null;
      const record = parsed as Record<string, unknown>;
      const manifest = validateManifest(record.manifest);
      const signature = typeof record.signature === "string" ? record.signature : null;
      const verifiedAt = typeof record.verifiedAt === "string" ? record.verifiedAt : null;
      if (!signature || !verifiedAt) return null;
      return { manifest, signature, verifiedAt };
    } catch {
      return null;
    }
  }

  write(value: CachedManifest): void {
    this.memory = value;
    this.storage?.setItem(this.key, JSON.stringify(value));
  }

  clear(): void {
    this.memory = null;
    this.storage?.removeItem(this.key);
  }
}
