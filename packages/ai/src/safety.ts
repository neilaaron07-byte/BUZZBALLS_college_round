import type { EvidenceItem, PatchPilotResponse } from "./contracts";

export function confidenceFromEvidence(evidence: readonly EvidenceItem[], base = 0.5): number {
  const sourceCount = new Set(evidence.map((item) => item.source)).size;
  const score = base + Math.min(0.35, evidence.length * 0.04) + Math.min(0.15, Math.max(0, sourceCount - 1) * 0.05);
  return Number(Math.min(0.99, score).toFixed(2));
}

export function assertEvidenceBacked(response: PatchPilotResponse): PatchPilotResponse {
  const uniqueIds = new Set<string>();
  for (const item of response.evidence) {
    if (!item.id || !item.text.trim() || uniqueIds.has(item.id)) throw new Error("PatchPilot returned unsupported or duplicate evidence.");
    uniqueIds.add(item.id);
  }
  if (response.proposal && response.proposal.autoApproved !== false) throw new Error("PatchPilot proposals must remain reviewable.");
  const sources = new Set(response.evidence.map((item) => item.source));
  const claim = `${response.headline} ${response.answer}`;
  if (/\b(?:deployed|published|live in production|verified successfully)\b/i.test(claim) && !sources.has("verification") && !sources.has("release")) throw new Error("PatchPilot made a deployment claim without release evidence.");
  return response;
}

export function statusForConfidence(score: number): "green" | "amber" | "red" {
  if (score >= 0.84) return "green";
  if (score >= 0.62) return "amber";
  return "red";
}
