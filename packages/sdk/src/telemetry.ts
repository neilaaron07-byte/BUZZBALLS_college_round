import type { SDKHealthEvent } from "./types";

export class TelemetryQueue {
  private readonly events: SDKHealthEvent[] = [];
  private readonly transport: ((events: readonly SDKHealthEvent[]) => Promise<void>) | null;
  private attempts = 0;
  private flushing = false;

  constructor(transport?: (events: readonly SDKHealthEvent[]) => Promise<void>) {
    this.transport = transport ?? null;
  }

  add(event: SDKHealthEvent): void {
    this.events.push(event);
  }

  size(): number {
    return this.events.length;
  }

  async flush(): Promise<boolean> {
    if (!this.transport || this.flushing || this.events.length === 0) return this.events.length === 0;
    this.flushing = true;
    const batch = this.events.splice(0, 20);
    try {
      await this.transport(batch);
      this.attempts = 0;
      this.flushing = false;
      return true;
    } catch {
      this.events.unshift(...batch);
      this.attempts += 1;
      const delayMs = Math.min(30_000, 250 * 2 ** Math.min(this.attempts, 7));
      this.flushing = false;
      await new Promise<void>((resolve) => globalThis.setTimeout(resolve, delayMs));
      return false;
    }
  }
}
