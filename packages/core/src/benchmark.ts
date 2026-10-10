import { fingerprintFromSnapshot, type ElementSnapshot } from "./fingerprint";
import { type ResolverCandidate } from "./resolver";

export interface ResolverBenchmarkScenario {
  id: string;
  target: ReturnType<typeof fingerprintFromSnapshot>;
  candidates: readonly ResolverCandidate[];
  expectedTargetId: string;
}

function seeded(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let value = Math.imul(state ^ state >>> 15, 1 | state);
    value ^= value + Math.imul(value ^ value >>> 7, 61 | value);
    return ((value ^ value >>> 14) >>> 0) / 4_294_967_296;
  };
}

function snapshot(index: number, moved: boolean, distractor: boolean): ElementSnapshot {
  const label = distractor ? "Cancel" : "Add to cart";
  return {
    tag: "button",
    attributes: {
      "data-testid": distractor ? `cancel-${index}` : `buy-${index}`,
      "aria-label": label,
      class: distractor ? "button secondary" : "button primary css-a1b2c3d4",
      role: "button",
    },
    text: label,
    path: moved ? ["main", "section", "purchase-panel", "div", "button"] : ["main", "section", "purchase-panel", "button"],
    siblings: ["h1", "p", "button"],
    landmarks: ["main", "product-card", "purchase-panel"],
    rect: { top: 420, left: 560, width: 180, height: 48, viewportWidth: 1440, viewportHeight: 900 },
    visualRole: "button",
  };
}

export function generateResolverBenchmark(seed = 20261010, count = 200): readonly ResolverBenchmarkScenario[] {
  const random = seeded(seed);
  return Array.from({ length: count }, (_, index) => {
    const moved = random() > 0.45;
    const target = fingerprintFromSnapshot(snapshot(index, false, false));
    const expectedTargetId = `candidate-${index}`;
    const recovered = fingerprintFromSnapshot(snapshot(index, moved, false));
    const distractor = fingerprintFromSnapshot(snapshot(index, !moved, true));
    return {
      id: `resolver-benchmark-${String(index + 1).padStart(3, "0")}`,
      target,
      candidates: [
        { id: expectedTargetId, label: "Add to cart", fingerprint: recovered },
        { id: `distractor-${index}`, label: "Cancel", fingerprint: distractor },
      ],
      expectedTargetId,
    };
  });
}
