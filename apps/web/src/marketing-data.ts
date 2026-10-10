import { evidenceBudgets, evidenceRecords, evidenceScore } from "../../dashboard/src/evidence-engine";
import type { DashboardTone } from "../../dashboard/src/dashboard-types";

export type MarketingTone = DashboardTone;

export type MarketingMetric = {
  key: string;
  label: string;
  value: string;
  detail: string;
  source: string;
  tone: MarketingTone;
};

export type WorkflowStage = {
  id: "break" | "patch" | "verify" | "ship" | "rollback";
  number: string;
  label: string;
  title: string;
  detail: string;
  status: string;
  tone: MarketingTone;
};

export type FeatureCard = {
  id: string;
  eyebrow: string;
  title: string;
  detail: string;
  tone: MarketingTone | "violet";
  metric: string;
};

export type ComparisonRow = {
  capability: string;
  patchwork: string;
  rebuild: string;
  visualTone: MarketingTone;
};

export type FaqItem = { question: string; answer: string };

export const marketingMetrics: MarketingMetric[] = evidenceRecords(108).map((record) => ({
  key: record.key,
  label: record.label,
  value: record.value,
  detail: record.detail,
  source: record.source,
  tone: record.tone,
}));

export const evidenceSummary = evidenceScore(evidenceRecords(108));

export const runtimeBudgets = evidenceBudgets().map((budget) => ({
  key: budget.key,
  label: budget.label,
  observed: budget.observed === null ? "Capture required" : `${budget.observed}${budget.unit === "KB" ? " KB gzip" : ` ${budget.unit}`}`,
  target: `${budget.target}${budget.unit === "KB" ? " KB max" : ` ${budget.unit}`}`,
  detail: budget.detail,
  tone: budget.tone,
}));

export const workflowStages: WorkflowStage[] = [
  { id: "break", number: "01", label: "BREAK", title: "See what visitors see", detail: "A release hides the Add to cart action under a stale promo layer. PATCHWORK captures the exact target and blast radius before anyone edits code.", status: "1 target blocked", tone: "red" },
  { id: "patch", number: "02", label: "PATCH", title: "Change one safe thing", detail: "PatchPilot proposes an allowlisted operation with the old value attached as an inverse. The public website is unchanged.", status: "Inverse attached", tone: "amber" },
  { id: "verify", number: "03", label: "VERIFY", title: "Prove the browser path", detail: "Replay the checkout click, compare the visual region, run accessibility checks, and keep console and network evidence beside the patch.", status: "12 / 12 checks", tone: "green" },
  { id: "ship", number: "04", label: "SHIP", title: "Release behind policy", detail: "Promote a signed manifest to a 25% canary. Health signals, reviewer ownership, and the kill switch stay visible in one control plane.", status: "Canary healthy", tone: "green" },
  { id: "rollback", number: "05", label: "ROLLBACK", title: "Undo without a rebuild", detail: "If the health boundary moves, restore the previous verified version from the time machine. The audit chain records the reason and actor.", status: "1 click away", tone: "green" },
];

export const featureCards: FeatureCard[] = [
  { id: "fingerprint", eyebrow: "TARGET GRAPH", title: "Semantic tracking", detail: "Follow moved, renamed, duplicated, or wrapped elements without applying a patch to the wrong target.", tone: "green", metric: "200 scenarios" },
  { id: "preview", eyebrow: "PRIVATE PREVIEW", title: "Isolated before public", detail: "Render the proposed state against the same page snapshot while production traffic remains untouched.", tone: "violet", metric: "0 public changes" },
  { id: "conflicts", eyebrow: "CONFLICT ENGINE", title: "Plain-English merges", detail: "See which operation won, which one is stale, and why a human needs to decide before the patch can ship.", tone: "amber", metric: "3 strategies" },
  { id: "verification", eyebrow: "BROWSER PROOF", title: "Replay the path", detail: "Interaction, visual, Axe, console, and network checks are saved as evidence instead of disappearing into a log.", tone: "green", metric: "12 / 12 green" },
  { id: "canary", eyebrow: "RELEASE HEALTH", title: "Canary with a brake", detail: "Pause, promote, or kill a release from the same screen as conversion, error, and health signals.", tone: "green", metric: "25% canary" },
  { id: "rollback", eyebrow: "TIME MACHINE", title: "Undo in one click", detail: "Restore the last healthy signed state and keep the incident explanation attached for the next person on call.", tone: "green", metric: "Hash intact" },
  { id: "audit", eyebrow: "AUDIT CHAIN", title: "Every seam accounted for", detail: "Immutable, exportable records connect the finding, patch, reviewer, verification run, release, and rollback.", tone: "green", metric: "Ed25519 verified" },
];

export const integrations = [
  { name: "GitHub", detail: "Pull request context" },
  { name: "Vercel", detail: "Deployment handoff" },
  { name: "Sentry", detail: "Health signals" },
  { name: "Playwright", detail: "Browser proof" },
  { name: "Linear", detail: "Owner and review" },
  { name: "Slack", detail: "Incident handoff" },
] as const;

export const comparisonRows: ComparisonRow[] = [
  { capability: "Patch a live element without a rebuild", patchwork: "Native workflow", rebuild: "Requires a release", visualTone: "green" },
  { capability: "Resolve moved or duplicated targets", patchwork: "Semantic resolver", rebuild: "Manual debugging", visualTone: "green" },
  { capability: "Preview before public traffic", patchwork: "Private snapshot", rebuild: "Preview environment", visualTone: "green" },
  { capability: "Undo the exact release", patchwork: "Signed inverse", rebuild: "Revert and redeploy", visualTone: "green" },
  { capability: "Explain what changed in plain English", patchwork: "PatchPilot + evidence", rebuild: "Depends on the team", visualTone: "green" },
];

export const faqs: FaqItem[] = [
  { question: "Does PATCHWORK change my source code?", answer: "No. A patch is independently managed, scoped to an allowlisted operation, and attached to the page fingerprint. You can promote it without rebuilding the original application." },
  { question: "What happens when the page changes?", answer: "The resolver compares structure, semantics, content, and nearby context. It can follow a moved or renamed target, ask for evidence when confidence is low, and block ambiguous matches." },
  { question: "Can a store owner use it?", answer: "Yes. Every finding has a green, amber, or red explanation in plain English. The guided path says what broke, what will change, and how to undo it." },
  { question: "How does rollback work?", answer: "Each release carries a signed manifest and inverse operation. The time machine restores the last healthy state and records the actor, reason, and health signal in the audit chain." },
  { question: "Where does PatchPilot run?", answer: "The offline engine runs locally for deterministic explanations. Provider adapters can be added later, but the safe proposal and conflict block do not depend on an external model." },
];

export function metricByKey(key: string): MarketingMetric | undefined {
  return marketingMetrics.find((metric) => metric.key === key);
}

export function featureToneLabel(tone: MarketingTone): string {
  return tone === "green" ? "Verified" : tone === "amber" ? "Review" : "Blocked";
}

export function marketingMetricSummary(): string {
  return `${evidenceSummary.passed} verified · ${evidenceSummary.review} in review · ${evidenceSummary.blocked} blocked`;
}
