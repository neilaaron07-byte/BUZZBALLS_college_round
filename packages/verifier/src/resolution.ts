import { fingerprintFromSnapshot, type ElementSnapshot } from "../../core/src/fingerprint";
import { resolveTarget, type ResolverCandidate } from "../../core/src/resolver";
import type { Page } from "playwright";
import type { ResolverTargetInput, VerificationCheck } from "./contracts";

interface SerializedSnapshot {
  id: string;
  label: string;
  snapshot: ElementSnapshot;
}

function collectSnapshots(page: Page): Promise<SerializedSnapshot[]> {
  return page.evaluate(() => {
    const landmarks = new Set(["main", "nav", "header", "footer", "section", "article", "aside"]);
    return Array.from(document.querySelectorAll<HTMLElement>("button, a, input, textarea, select, h1, h2, h3, h4, h5, h6, [role], [data-testid]"))
      .map((element, index) => {
        const attributes = Object.fromEntries(Array.from(element.attributes).map((attribute) => [attribute.name, attribute.value]));
        const path: string[] = [];
        let current: HTMLElement | null = element;
        while (current && path.length < 8) {
          path.unshift(current.tagName.toLowerCase());
          current = current.parentElement;
        }
        const rect = element.getBoundingClientRect();
        const snapshot: ElementSnapshot = {
          tag: element.tagName.toLowerCase(),
          attributes,
          text: element.textContent ?? "",
          path,
          siblings: Array.from(element.parentElement?.children ?? []).map((child) => child.tagName.toLowerCase()),
          landmarks: path.filter((tag) => landmarks.has(tag)),
          rect: {
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height,
            viewportWidth: window.innerWidth,
            viewportHeight: window.innerHeight,
          },
        };
        return { id: `dom-${index}`, label: element.innerText.trim().slice(0, 120) || element.tagName.toLowerCase(), snapshot };
      });
  });
}

export async function checkResolution(page: Page, target: ResolverTargetInput): Promise<VerificationCheck> {
  const startedAt = Date.now();
  const snapshots = await collectSnapshots(page);
  const candidates: ResolverCandidate[] = snapshots.map((candidate) => ({
    id: candidate.id,
    label: candidate.label,
    fingerprint: fingerprintFromSnapshot(candidate.snapshot),
  }));
  const resolved = resolveTarget(target.evidence, candidates);
  const passed = resolved.outcome === "exact" || resolved.outcome === "moved";
  return {
    id: "resolution-target",
    kind: "resolution",
    label: "Semantic target resolution",
    status: passed ? "passed" : resolved.outcome === "ambiguous" ? "warning" : "failed",
    blocking: true,
    explanation: resolved.reason,
    durationMs: Date.now() - startedAt,
    evidence: [resolved.outcome, `confidence ${resolved.confidence.toFixed(2)}`, resolved.winner ? `winner ${resolved.winner.label}` : "no winner"],
  };
}
