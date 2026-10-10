import { scanPage, type PatchOperation, type ScanFinding } from "../../core/src/index";
import type { BlastRadiusNarrative, ConfidenceSummary, EvidenceItem, HealthNarrative, NextAction, PatchPilotContext, PatchPilotOptions, PatchPilotProvider, PatchPilotRequest, PatchPilotResponse, PatchProposal, ResponseStatus } from "./contracts";
import { confidenceFromEvidence, assertEvidenceBacked, statusForConfidence } from "./safety";
import { sanitizePatchPilotContext, sanitizePatchPilotQuestion } from "./redaction";

function evidence(id: string, source: EvidenceItem["source"], text: string): EvidenceItem {
  return { id, source, text };
}

function confidence(score: number, explanation: string): ConfidenceSummary {
  const bounded = Number(Math.max(0, Math.min(0.99, score)).toFixed(2));
  return { score: bounded, status: statusForConfidence(bounded), label: bounded >= 0.84 ? "high" : bounded >= 0.62 ? "medium" : "low", explanation };
}

function action(label: string, reason: string, safe: boolean): NextAction {
  return { label, reason, safe };
}

function response(input: Omit<PatchPilotResponse, "confidence"> & { confidence: ConfidenceSummary }): PatchPilotResponse {
  return assertEvidenceBacked(input);
}

function highestFinding(findings: readonly ScanFinding[]): ScanFinding | undefined {
  const rank: Record<ScanFinding["severity"], number> = { critical: 5, high: 4, medium: 3, low: 2, info: 1 };
  return [...findings].sort((left, right) => rank[right.severity] - rank[left.severity] || right.confidence - left.confidence)[0];
}

function findingEvidence(finding: ScanFinding): EvidenceItem[] {
  return [evidence(`finding:${finding.id}`, "scanner", finding.summary), ...finding.evidence.map((item, index) => evidence(`finding:${finding.id}:evidence:${index + 1}`, "scanner", item))];
}

function statusForSeverity(severity: ScanFinding["severity"]): ResponseStatus {
  return severity === "critical" || severity === "high" ? "red" : severity === "medium" ? "amber" : "green";
}

function explainFinding(finding: ScanFinding): PatchPilotResponse {
  const evidenceItems = findingEvidence(finding);
  const score = confidenceFromEvidence(evidenceItems, finding.confidence);
  return response({
    intent: "explain",
    status: statusForSeverity(finding.severity),
    headline: finding.summary,
    answer: `${finding.explanation} PATCHWORK found this with ${Math.round(finding.confidence * 100)}% detector confidence.`,
    confidence: confidence(score, "The explanation is grounded in the scanner finding and its recorded evidence."),
    nextAction: action("Review the affected element", "Confirm the visual context before drafting a change.", true),
    evidence: evidenceItems,
  });
}

function suggestionForFinding(finding: ScanFinding, context: PatchPilotContext): PatchProposal {
  const findingEvidenceItems = findingEvidence(finding);
  const resolution = context.resolution;
  const targetLabel = finding.targetIds[0] ?? "the affected element";
  if (!resolution || !resolution.targetId || (resolution.outcome !== "exact" && resolution.outcome !== "moved")) {
    return { id: `proposal-${finding.id}`, status: "blocked", operation: null, targetLabel, confidence: confidence(resolution?.confidence ?? finding.confidence * 0.5, resolution?.reason ?? "The target has not been resolved safely."), explanation: resolution?.reason ?? "PATCHWORK cannot draft a change until the target is uniquely resolved.", nextAction: action("Inspect the target", "Capture fresh structural evidence or resolve the ambiguity before editing.", true), autoApproved: false, evidence: [...findingEvidenceItems, ...(resolution ? [evidence(`resolver:${finding.id}`, "resolver", resolution.reason)] : [])] };
  }
  const targetEvidence = context.target ? {
    ...context.target,
    attributes: { ...context.target.attributes, meaningfulClasses: [...context.target.attributes.meaningfulClasses] },
    textTokens: [...context.target.textTokens],
    textNgrams: [...context.target.textNgrams],
    path: [...context.target.path],
    siblingSignature: [...context.target.siblingSignature],
    landmarkChain: [...context.target.landmarkChain],
  } : undefined;
  const operation: PatchOperation | null = finding.detector === "contrast" && targetEvidence ? { id: `op-${finding.id}`, kind: "style", target: { fingerprint: `sha256-${"c".repeat(64)}`, fallbackLabel: targetLabel, expectedTag: targetEvidence.tag, evidence: targetEvidence }, property: "color", value: "#172033" } : null;
  if (!operation) {
    return { id: `proposal-${finding.id}`, status: "blocked", operation: null, targetLabel, confidence: confidence(resolution.confidence, "The target was found, but this offline provider does not have a safe typed operation for this detector."), explanation: "The target is resolved, but PatchPilot will not invent an operation for this finding.", nextAction: action("Draft the change manually", "Choose a supported property in the review panel so the proposed value is explicit.", true), autoApproved: false, evidence: [...findingEvidenceItems, evidence(`resolver:${finding.id}`, "resolver", resolution.reason)] };
  }
  const moved = resolution.outcome === "moved";
  const currentElement = context.snapshot?.elements.find((element) => element.id === finding.targetIds[0]);
  const inverse = currentElement?.styles?.foreground ? { ...operation, value: currentElement.styles.foreground } : null;
  return { id: `proposal-${finding.id}`, status: "review", operation, inverse, targetLabel, confidence: confidence(resolution.confidence, moved ? "The resolver recovered a moved target with a clear margin; review is still required." : "The resolver found a unique target and the operation uses an allowed core property."), explanation: moved ? `The original target moved, but PATCHWORK recovered ${targetLabel} from its semantic evidence. The contrast patch remains review-only.` : `A reviewable contrast patch is ready for ${targetLabel}; it changes only the text color and does not publish automatically.`, nextAction: action("Open the isolated preview", "Verify the visual result and accessibility delta before review.", true), autoApproved: false, evidence: [...findingEvidenceItems, evidence(`resolver:${finding.id}`, "resolver", resolution.reason), evidence(`operation:${finding.id}`, "scanner", "Operation limited to the core CSS color allowlist.")] };
}

function blastRadius(context: PatchPilotContext): BlastRadiusNarrative {
  const finding = highestFinding(context.findings ?? []);
  const elementCount = finding?.blastRadius.elementCount ?? context.target ? 1 : 0;
  const pageCount = finding?.blastRadius.pageCount ?? 1;
  const viewportCount = context.verification ? context.verification.failedChecks + context.verification.warningChecks > 0 ? 3 : 1 : 1;
  const status: ResponseStatus = elementCount > 3 || pageCount > 1 ? "red" : elementCount > 0 ? "amber" : "green";
  const items = finding ? findingEvidence(finding) : [evidence("blast-radius:none", "scanner", "No scanner finding was supplied.")];
  return { status, headline: elementCount === 0 ? "No measured blast radius" : `${elementCount} element${elementCount === 1 ? "" : "s"} on ${pageCount} page${pageCount === 1 ? "" : "s"}`, detail: `${finding?.blastRadius.explanation ?? "This estimate is limited to the supplied evidence."} Viewport coverage in this run: ${viewportCount}.`, affectedElements: elementCount, affectedPages: pageCount, affectedViewports: viewportCount, evidence: items };
}

function healthNarrative(context: PatchPilotContext): HealthNarrative {
  const signal = context.health;
  if (!signal) return { status: "amber", score: 0, headline: "Health data is not available", detail: "PatchPilot will not infer runtime health without SDK or verification events.", nextAction: action("Run a verification", "Collect a fresh browser and runtime signal before shipping.", true), evidence: [evidence("health:missing", "health", "No health signal was supplied.")] };
  const deductions = Math.min(100, signal.errorRatePercent * 4 + signal.sdkFailures * 8 + Math.max(0, signal.latencyMs - 400) / 20 + Math.max(0, signal.observedHoursAgo - 24) / 2);
  const score = Math.round(Math.max(0, Math.min(100, signal.score - deductions)));
  const status: ResponseStatus = score >= 85 ? "green" : score >= 65 ? "amber" : "red";
  return { status, score, headline: score >= 85 ? "Health is steady" : score >= 65 ? "Health needs a closer look" : "Health is not safe to ship", detail: `${signal.errorRatePercent.toFixed(2)}% error rate, ${signal.latencyMs} ms latency, and ${signal.sdkFailures} SDK failures were observed ${signal.observedHoursAgo.toFixed(1)} hours ago.`, nextAction: action(status === "green" ? "Review the release" : "Investigate health signals", status === "green" ? "The supplied runtime signals are within the current policy range." : "Resolve the red or amber signal before increasing rollout.", status === "green"), evidence: [evidence("health:score", "health", `Base health score ${signal.score}/100.`), evidence("health:error-rate", "health", `${signal.errorRatePercent.toFixed(2)}% error rate.`), evidence("health:latency", "health", `${signal.latencyMs} ms latency.`), evidence("health:sdk", "health", `${signal.sdkFailures} SDK failures.`)] };
}

export class OfflinePatchPilot implements PatchPilotProvider {
  readonly name = "offline";
  private readonly now: () => Date;

  constructor(options: PatchPilotOptions = {}) {
    this.now = options.now ?? (() => new Date());
  }

  async complete(request: PatchPilotRequest): Promise<PatchPilotResponse> {
    request = { ...request, context: sanitizePatchPilotContext(request.context), question: sanitizePatchPilotQuestion(request.question) };
    const findings = request.context.findings ?? (request.context.snapshot ? scanPage(request.context.snapshot) : []);
    if (request.intent === "scan") {
      const finding = highestFinding(findings);
      if (!finding) return response({ intent: "scan", status: "green", headline: "No scanner findings", answer: "PATCHWORK did not find a supported issue in the supplied snapshot.", confidence: confidence(0.72, "The result is limited to the detectors that ran on this snapshot."), nextAction: action("Review the page manually", "A clean scan is not proof that every user flow is healthy.", true), evidence: [evidence("scan:clean", "scanner", "All supported detectors returned no finding.")] });
      return { ...explainFinding(finding), intent: "scan" };
    }
    if (request.intent === "explain") {
      const finding = highestFinding(findings);
      return finding ? explainFinding(finding) : await this.complete({ ...request, intent: "scan" });
    }
    if (request.intent === "suggest" || request.intent === "draft") {
      const finding = highestFinding(findings);
      if (!finding) return response({ intent: request.intent, status: "amber", headline: "There is nothing safe to propose", answer: "PatchPilot needs a scanner finding before it can create a reviewable patch.", confidence: confidence(0.35, "No finding or target evidence was supplied."), nextAction: action("Run a scan", "Start with measured page evidence.", true), evidence: [evidence("proposal:missing-finding", "scanner", "No scanner finding was supplied.")] });
      const proposal = suggestionForFinding(finding, request.context);
      return response({ intent: request.intent, status: proposal.status === "review" ? "amber" : "red", headline: proposal.status === "review" ? "A reviewable fix is ready" : "PatchPilot blocked this proposal", answer: proposal.explanation, confidence: proposal.confidence, nextAction: proposal.nextAction, evidence: proposal.evidence, proposal });
    }
    const radius = blastRadius(request.context);
    const health = healthNarrative(request.context);
    const now = this.now();
    const age = request.context.releaseAgeHours ?? 0;
    return response({ intent: "summarize", status: health.status === "red" || radius.status === "red" ? "red" : health.status === "amber" || radius.status === "amber" ? "amber" : "green", headline: `${radius.headline}; health ${health.score || "unavailable"}`, answer: `${radius.detail} ${health.detail} Snapshot generated ${now.toISOString()} with a release age of ${age.toFixed(1)} hours.`, confidence: confidence(0.78, "The summary combines only supplied scanner, verification, health, and release signals."), nextAction: health.nextAction, evidence: [...radius.evidence, ...health.evidence], blastRadius: radius, health });
  }
}
