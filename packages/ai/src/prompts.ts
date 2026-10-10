import type { PatchPilotIntent } from "./contracts";

export interface PromptTemplate {
  intent: PatchPilotIntent;
  system: string;
  instruction: string;
}

export type NarrativePromptName = "finding" | "conflict" | "releaseRisk" | "rollback";

export interface NarrativePromptTemplate {
  name: NarrativePromptName;
  system: string;
  instruction: string;
  requiredEvidence: readonly string[];
}

const safetyPreamble = "You are PatchPilot inside PATCHWORK. Use only supplied evidence. Never invent a selector, release state, browser result, or approval. Explain uncertainty in plain English and leave risky changes for human review.";

export const promptTemplates: Readonly<Record<PatchPilotIntent, PromptTemplate>> = {
  scan: {
    intent: "scan",
    system: safetyPreamble,
    instruction: "Prioritize the highest-confidence finding, name the affected element, explain the user impact, and recommend one safe next action.",
  },
  explain: {
    intent: "explain",
    system: safetyPreamble,
    instruction: "Translate the finding into one concise sentence for a non-technical teammate, then state the evidence that supports it.",
  },
  suggest: {
    intent: "suggest",
    system: safetyPreamble,
    instruction: "Suggest a reviewable patch only when the target has enough semantic evidence. Mark ambiguous, missing, unsafe, or unsupported changes as blocked.",
  },
  summarize: {
    intent: "summarize",
    system: safetyPreamble,
    instruction: "Describe blast radius across elements, pages, and viewports. Distinguish measured impact from an estimate.",
  },
  draft: {
    intent: "draft",
    system: safetyPreamble,
    instruction: "Turn a reviewed proposal into a typed draft without approving, publishing, or broadening its target.",
  },
};

export const narrativePromptTemplates: Readonly<Record<NarrativePromptName, NarrativePromptTemplate>> = {
  finding: {
    name: "finding",
    system: safetyPreamble,
    instruction: "Explain the highest-severity finding in plain English. Name the affected target and separate measured evidence from a recommendation.",
    requiredEvidence: ["finding summary", "detector evidence", "confidence"],
  },
  conflict: {
    name: "conflict",
    system: safetyPreamble,
    instruction: "Explain why two patch changes conflict, identify the property or target they share, and propose the smallest reviewable resolution.",
    requiredEvidence: ["conflict kind", "left revision", "right revision"],
  },
  releaseRisk: {
    name: "releaseRisk",
    system: safetyPreamble,
    instruction: "Summarize release risk using verification, health, target confidence, and age. Do not infer a successful deployment.",
    requiredEvidence: ["verification status", "health signal", "release age"],
  },
  rollback: {
    name: "rollback",
    system: safetyPreamble,
    instruction: "Explain what a rollback would restore, why it is recommended, and which observed signal triggered it. Keep the action reversible and explicit.",
    requiredEvidence: ["release id", "health or verification signal", "previous working revision"],
  },
};

export function renderPrompt(intent: PatchPilotIntent, evidence: readonly string[]): string {
  const template = promptTemplates[intent];
  return [template.system, template.instruction, `Evidence:\n${evidence.map((item) => `- ${item}`).join("\n")}`].join("\n\n");
}

export function renderNarrativePrompt(name: NarrativePromptName, evidence: readonly string[]): string {
  const template = narrativePromptTemplates[name];
  return [template.system, template.instruction, `Required evidence: ${template.requiredEvidence.join(", ")}`, `Evidence:\n${evidence.map((item) => `- ${item}`).join("\n")}`].join("\n\n");
}
