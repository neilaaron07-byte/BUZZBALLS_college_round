import { faqs, featureCards, marketingMetrics, runtimeBudgets, workflowStages } from "./marketing-data";
import type { FeatureCard, MarketingMetric, MarketingTone, WorkflowStage } from "./marketing-data";

export type DemoStep = "idle" | "scanned" | "fixed" | "shipped";
export type PlaygroundMode = "safe" | "ambiguous" | "unsupported";
export type PlaygroundOutcome = "ready" | "blocked" | "review";
export type StoryMode = WorkflowStage["id"];

export type DemoStatus = {
  tone: MarketingTone | "violet";
  title: string;
  detail: string;
  stateLabel: string;
  actionLabel: string;
};

export type PlaygroundResult = {
  outcome: PlaygroundOutcome;
  title: string;
  detail: string;
  operation: string;
  inverse: string;
  confidence: number;
  nextAction: string;
};

export type AiMessage = {
  id: string;
  role: "assistant" | "operator";
  text: string;
  tone: MarketingTone | "violet";
};

export function demoStatus(step: DemoStep): DemoStatus {
  if (step === "scanned") return { tone: "amber", title: "One target found", detail: "The Add to cart button is covered by a stale promo layer.", stateLabel: "Review", actionLabel: "Create isolated patch" };
  if (step === "fixed") return { tone: "violet", title: "Preview is isolated", detail: "The inverse operation is attached before any public traffic changes.", stateLabel: "Private", actionLabel: "Ship to 25% canary" };
  if (step === "shipped") return { tone: "green", title: "Shipped safely", detail: "The canary is healthy and one-click rollback remains available.", stateLabel: "Healthy", actionLabel: "Reset the demo" };
  return { tone: "amber", title: "Ready to scan", detail: "Start with the seeded checkout failure.", stateLabel: "Review", actionLabel: "Scan the incident" };
}

export function demoStepIndex(step: DemoStep): number {
  return step === "idle" ? -1 : step === "scanned" ? 0 : step === "fixed" ? 1 : 2;
}

export function nextDemoStep(step: DemoStep): DemoStep {
  return step === "scanned" ? "fixed" : step === "fixed" ? "shipped" : step;
}

export function storyById(id: StoryMode): WorkflowStage {
  return workflowStages.find((stage) => stage.id === id) ?? workflowStages[0]!;
}

export function storyProgress(id: StoryMode): number {
  const index = workflowStages.findIndex((stage) => stage.id === id);
  return Math.round(((index + 1) / workflowStages.length) * 100);
}

export function safePlaygroundResult(mode: PlaygroundMode): PlaygroundResult {
  if (mode === "safe") {
    return {
      outcome: "ready",
      title: "Safe proposal ready",
      detail: "PATCHWORK matched the product action by role, label, and nearby price context.",
      operation: "button[data-pw-target='buy'].style.backgroundColor = '#171923'",
      inverse: "button[data-pw-target='buy'].style.backgroundColor = '#c5cbd6'",
      confidence: 99,
      nextAction: "Open isolated preview",
    };
  }
  if (mode === "ambiguous") {
    return {
      outcome: "review",
      title: "Human review required",
      detail: "Two buttons share the same label after the layout update. PATCHWORK will not guess which one is the checkout target.",
      operation: "No operation saved",
      inverse: "Not available until a target is selected",
      confidence: 54,
      nextAction: "Compare target evidence",
    };
  }
  return {
    outcome: "blocked",
    title: "Operation blocked",
    detail: "Changing inline script content is outside the safe allowlist for a visual hotfix.",
    operation: "script.textContent = '…'",
    inverse: "No inverse created",
    confidence: 100,
    nextAction: "Open a source release instead",
  };
}

export function toneLabel(tone: MarketingTone | "violet"): string {
  return tone === "green" ? "Verified" : tone === "amber" ? "Review" : tone === "red" ? "Blocked" : "Private preview";
}

export function toneClass(tone: MarketingTone | "violet"): string {
  return `is-${tone}`;
}

export function evidenceMetricCards(): MarketingMetric[] {
  return marketingMetrics.filter((metric) => ["resolver", "runtime", "regression", "quality"].includes(metric.key));
}

export function releaseMetrics(): MarketingMetric[] {
  return marketingMetrics.filter((metric) => ["release", "accessibility", "lighthouse"].includes(metric.key));
}

export function budgetLabel(key: string): string {
  return runtimeBudgets.find((budget) => budget.key === key)?.observed ?? "Capture required";
}

export function featuresByTone(tone: FeatureCard["tone"]): FeatureCard[] {
  return featureCards.filter((feature) => feature.tone === tone);
}

export function initialAiMessages(): AiMessage[] {
  return [
    { id: "ai-1", role: "assistant", tone: "violet", text: "I found one blocked checkout target on ShopNest production.", },
    { id: "ai-2", role: "assistant", tone: "green", text: "The resolver is 99% confident. The patch is scoped to the button color and keeps an inverse.", },
  ];
}

export function answerForQuestion(question: string): string {
  const normalized = question.toLowerCase();
  if (normalized.includes("rollback") || normalized.includes("undo")) return "Rollback restores the previous verified manifest, preserves the inverse operation, and records the reason in the hash-linked audit chain.";
  if (normalized.includes("conflict") || normalized.includes("duplicate")) return "When confidence drops below the safe threshold, PATCHWORK pauses and shows the competing targets instead of applying a guess.";
  if (normalized.includes("security") || normalized.includes("safe")) return "The public path is protected by same-origin rules, allowlisted operations, signed manifests, review gates, and a kill switch.";
  return "The shortest safe path is SCAN the target, FIX one constrained property, then SHIP only after browser evidence turns green.";
}

export function filterFaqs(query: string): typeof faqs {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return faqs;
  return faqs.filter((faq) => `${faq.question} ${faq.answer}`.toLowerCase().includes(normalized));
}

export function formatMetricSource(source: string): string {
  return source.replace("packages/", "").replace("apps/", "").replace("/src", "");
}

export function formatElapsed(seconds: number): string {
  return `00:${String(Math.min(99, seconds)).padStart(2, "0")}`;
}
