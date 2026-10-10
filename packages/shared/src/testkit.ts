export class DeterministicClock {
  #currentMs: number;

  constructor(startIso = "2026-10-10T12:00:00.000Z") {
    this.#currentMs = Date.parse(startIso);
    if (!Number.isFinite(this.#currentMs)) {
      throw new Error(`Invalid clock start: ${startIso}`);
    }
  }

  now(): Date {
    return new Date(this.#currentMs);
  }

  iso(): string {
    return this.now().toISOString();
  }

  advance(milliseconds: number): Date {
    if (!Number.isFinite(milliseconds) || milliseconds < 0) {
      throw new Error("Clock advances must be finite and non-negative.");
    }

    this.#currentMs += milliseconds;
    return this.now();
  }
}

export function createSeededRandom(seed: string): () => number {
  let state = 2166136261;
  for (const character of seed) {
    state ^= character.charCodeAt(0);
    state = Math.imul(state, 16777619);
  }

  return () => {
    state += state << 13;
    state ^= state >>> 17;
    state += state << 5;
    return (state >>> 0) / 4294967296;
  };
}

export function fixtureId(scope: string, index: number): string {
  const safeScope = scope.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return `${safeScope || "fixture"}-${String(index + 1).padStart(3, "0")}`;
}
