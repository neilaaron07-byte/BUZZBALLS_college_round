import type { SemanticFingerprint } from "./fingerprint";

export const RESOLVER_WEIGHTS = {
  tag: 0.30,
  attributes: 0.20,
  text: 0.15,
  path: 0.10,
  siblings: 0.10,
  landmarks: 0.05,
  region: 0.05,
  visualRole: 0.05,
} as const;

export type ResolverOutcome = "exact" | "moved" | "ambiguous" | "missing";
export type SignalName = keyof typeof RESOLVER_WEIGHTS;

export interface ResolverThresholds {
  minimumConfidence: number;
  minimumMargin: number;
  exactConfidence: number;
}

export const DEFAULT_RESOLVER_THRESHOLDS: ResolverThresholds = {
  minimumConfidence: 0.72,
  minimumMargin: 0.10,
  exactConfidence: 0.96,
};

export interface ResolverCandidate {
  id: string;
  label: string;
  fingerprint: SemanticFingerprint;
}

export interface SignalBreakdown {
  signal: SignalName;
  score: number;
  weight: number;
  contribution: number;
  explanation: string;
}

export interface ScoredCandidate {
  id: string;
  label: string;
  score: number;
  signals: readonly SignalBreakdown[];
}

export interface ResolverResult {
  outcome: ResolverOutcome;
  confidence: number;
  targetId: string | null;
  runnerUp: ScoredCandidate | null;
  winner: ScoredCandidate | null;
  reason: string;
}

function setSimilarity(left: readonly string[], right: readonly string[]): number {
  const a = new Set(left);
  const b = new Set(right);
  if (a.size === 0 && b.size === 0) return 1;
  if (a.size === 0 || b.size === 0) return 0;
  const intersection = [...a].filter((value) => b.has(value)).length;
  return intersection / new Set([...a, ...b]).size;
}

function attributeSimilarity(left: SemanticFingerprint["attributes"], right: SemanticFingerprint["attributes"]): number {
  const keys = ["id", "testId", "name", "role", "ariaLabel", "hrefPattern"] as const;
  const scores = keys.map((key) => left[key] === undefined && right[key] === undefined ? 1 : left[key] === right[key] ? 1 : 0);
  const classes = setSimilarity(left.meaningfulClasses, right.meaningfulClasses);
  return (scores.reduce<number>((sum, score) => sum + score, 0) + classes) / (keys.length + 1);
}

function pathSimilarity(left: readonly string[], right: readonly string[]): number {
  if (left.length === 0 && right.length === 0) return 1;
  const overlap = Math.min(left.length, right.length);
  let prefix = 0;
  while (prefix < overlap && left[prefix] === right[prefix]) prefix += 1;
  if (prefix === overlap && left.length === right.length) return 1;
  return prefix / Math.max(left.length, right.length);
}

function regionSimilarity(left: SemanticFingerprint["region"], right: SemanticFingerprint["region"]): number {
  if (left === right) return 1;
  const leftBand = left.split("-")[0];
  const rightBand = right.split("-")[0];
  return leftBand === rightBand ? 0.5 : 0;
}

function signalBreakdown(target: SemanticFingerprint, candidate: SemanticFingerprint): readonly SignalBreakdown[] {
  const scores: Record<SignalName, { score: number; explanation: string }> = {
    tag: { score: target.tag === candidate.tag ? 1 : 0, explanation: target.tag === candidate.tag ? `Both elements are ${target.tag} tags.` : `The tag changed from ${target.tag} to ${candidate.tag}.` },
    attributes: { score: attributeSimilarity(target.attributes, candidate.attributes), explanation: "Stable id, role, label, href, and meaningful class signals agree." },
    text: { score: setSimilarity(target.textNgrams, candidate.textNgrams) * 0.6 + setSimilarity(target.textTokens, candidate.textTokens) * 0.4, explanation: "Normalized copy and phrase fragments were compared." },
    path: { score: pathSimilarity(target.path, candidate.path), explanation: "The structural path was compared, allowing wrapper movement." },
    siblings: { score: setSimilarity(target.siblingSignature, candidate.siblingSignature), explanation: "Nearby sibling tags and roles were compared." },
    landmarks: { score: setSimilarity(target.landmarkChain, candidate.landmarkChain), explanation: "Nearest semantic landmarks were compared." },
    region: { score: regionSimilarity(target.region, candidate.region), explanation: "The coarse viewport region was compared." },
    visualRole: { score: target.visualRole === candidate.visualRole ? 1 : 0, explanation: target.visualRole === candidate.visualRole ? `Both elements behave like ${target.visualRole}s.` : "The visual role differs." },
  };
  return (Object.keys(RESOLVER_WEIGHTS) as SignalName[]).map((signal) => ({
    signal,
    score: Number(scores[signal].score.toFixed(4)),
    weight: RESOLVER_WEIGHTS[signal],
    contribution: Number((scores[signal].score * RESOLVER_WEIGHTS[signal]).toFixed(4)),
    explanation: scores[signal].explanation,
  }));
}

export function scoreFingerprint(target: SemanticFingerprint, candidate: SemanticFingerprint): { score: number; signals: readonly SignalBreakdown[] } {
  const signals = signalBreakdown(target, candidate);
  const score = Number(signals.reduce((sum, signal) => sum + signal.contribution, 0).toFixed(4));
  return { score, signals };
}

function explainOutcome(outcome: ResolverOutcome, winner: ScoredCandidate | null, runnerUp: ScoredCandidate | null, thresholds: ResolverThresholds): string {
  if (outcome === "missing") return "PATCHWORK could not find a candidate with enough structural or semantic evidence to apply safely.";
  if (outcome === "ambiguous") return `Two candidates are too close to distinguish safely (${winner?.score.toFixed(2)} vs ${runnerUp?.score.toFixed(2)}); review the target before applying.`;
  if (outcome === "exact") return `Exact target match: ${winner?.label ?? "the target"} scored ${winner?.score.toFixed(2)}, above the ${thresholds.exactConfidence.toFixed(2)} exact-match threshold.`;
  return `Moved target recovered: ${winner?.label ?? "the target"} scored ${winner?.score.toFixed(2)} with a clear margin over the next candidate.`;
}

export function resolveTarget(
  target: SemanticFingerprint,
  candidates: readonly ResolverCandidate[],
  thresholds: ResolverThresholds = DEFAULT_RESOLVER_THRESHOLDS,
): ResolverResult {
  if (candidates.length === 0) return { outcome: "missing", confidence: 0, targetId: null, runnerUp: null, winner: null, reason: explainOutcome("missing", null, null, thresholds) };
  const scored = candidates.map((candidate) => {
    const result = scoreFingerprint(target, candidate.fingerprint);
    return { id: candidate.id, label: candidate.label, score: result.score, signals: result.signals };
  }).sort((left, right) => right.score - left.score);
  const winner = scored[0] ?? null;
  const runnerUp = scored[1] ?? null;
  if (!winner || winner.score < thresholds.minimumConfidence) return { outcome: "missing", confidence: winner?.score ?? 0, targetId: null, runnerUp, winner, reason: explainOutcome("missing", winner, runnerUp, thresholds) };
  const margin = winner.score - (runnerUp?.score ?? 0);
  if (runnerUp && margin < thresholds.minimumMargin) return { outcome: "ambiguous", confidence: winner.score, targetId: null, runnerUp, winner, reason: explainOutcome("ambiguous", winner, runnerUp, thresholds) };
  const outcome: ResolverOutcome = winner.score >= thresholds.exactConfidence ? "exact" : "moved";
  return { outcome, confidence: winner.score, targetId: winner.id, runnerUp, winner, reason: explainOutcome(outcome, winner, runnerUp, thresholds) };
}
