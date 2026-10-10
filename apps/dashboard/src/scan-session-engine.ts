import type { DashboardData, DashboardFinding, DashboardTone } from "./dashboard-types";

export type ScanDetectorId = "contrast" | "duplicate-action" | "stale-copy" | "missing-label" | "broken-link" | "layout-overflow";
export type ScanRunStatus = "queued" | "running" | "completed" | "failed" | "stale";
export type ScanSource = "manual" | "scheduled" | "incident";
export type ScanDetectorState = "clear" | "finding" | "review" | "blocked";

export type ScanDetector = {
  id: ScanDetectorId;
  label: string;
  description: string;
  state: ScanDetectorState;
  tone: DashboardTone;
  findingCount: number;
  confidence: number;
  currentCount: number;
  previousCount: number;
  delta: number;
  route: string;
  evidence: readonly string[];
  nextAction: string;
};

export type ScanTotals = {
  detectorCount: number;
  findingCount: number;
  criticalCount: number;
  reviewCount: number;
  clearCount: number;
  coveragePercent: number;
};

export type ScanSession = {
  id: string;
  status: ScanRunStatus;
  source: ScanSource;
  target: string;
  viewport: string;
  startedAt: string;
  finishedAt: string | null;
  runCount: number;
  detectors: readonly ScanDetector[];
  findings: readonly DashboardFinding[];
  reviewedFindingIds: readonly string[];
  totals: ScanTotals;
  tone: DashboardTone;
  headline: string;
  explanation: string;
  nextAction: "review" | "patch" | "rescan" | "recover";
};

export type ScanComparison = {
  newFindings: number;
  resolvedFindings: number;
  unchangedFindings: number;
  detectorChanges: readonly { id: ScanDetectorId; label: string; before: number; after: number; delta: number }[];
  tone: DashboardTone;
  summary: string;
};

export type ScanTriage = {
  tone: DashboardTone;
  state: "open" | "reviewed" | "blocked" | "needs-evidence";
  label: string;
  explanation: string;
  nextAction: "review" | "create-patch" | "capture-evidence" | "none";
};

type DetectorDefinition = {
  id: ScanDetectorId;
  label: string;
  description: string;
  route: string;
  clearEvidence: readonly string[];
};

const detectorDefinitions: readonly DetectorDefinition[] = [
  { id: "contrast", label: "Contrast boundary", description: "Checks text and surface pairs against the configured accessibility threshold.", route: "/products/aurora", clearEvidence: ["Foreground and background colors captured", "Normal-text threshold evaluated"] },
  { id: "duplicate-action", label: "Duplicate actions", description: "Looks for two interactive controls that promise the same next action.", route: "/products/aurora", clearEvidence: ["Interactive labels compared", "Action targets are unique"] },
  { id: "stale-copy", label: "Stale release copy", description: "Finds release language that still describes an old product state.", route: "/products/aurora", clearEvidence: ["Visible copy checked", "Release marker is current"] },
  { id: "missing-label", label: "Missing labels", description: "Checks form controls and icon actions for an accessible name.", route: "/checkout", clearEvidence: ["Form labels are present", "Icon actions expose an accessible name"] },
  { id: "broken-link", label: "Broken links", description: "Verifies same-origin links and records the response boundary.", route: "/products/aurora", clearEvidence: ["Same-origin links checked", "No failed navigation observed"] },
  { id: "layout-overflow", label: "Viewport overflow", description: "Checks rendered bounds at the mobile viewport used by the release.", route: "/products/aurora", clearEvidence: ["390px viewport measured", "Rendered bounds stay inside the frame"] },
];

const scanStart = "2026-10-10T07:20:00.000Z";
const scanFinish = "2026-10-10T07:20:04.000Z";

function findingDetector(finding: DashboardFinding): ScanDetectorId {
  const text = `${finding.id} ${finding.summary} ${finding.explanation}`.toLowerCase();
  if (text.includes("contrast") || text.includes("read")) return "contrast";
  if (text.includes("duplicate")) return "duplicate-action";
  if (text.includes("copy") || text.includes("stale")) return "stale-copy";
  if (text.includes("label")) return "missing-label";
  if (text.includes("link")) return "broken-link";
  return "layout-overflow";
}

function detectorTone(findings: readonly DashboardFinding[]): DashboardTone {
  if (findings.some((finding) => finding.severity === "critical" || finding.severity === "high")) return "red";
  if (findings.length > 0) return "amber";
  return "green";
}

function detectorState(findings: readonly DashboardFinding[]): ScanDetectorState {
  if (findings.some((finding) => finding.severity === "critical" || finding.severity === "high")) return "blocked";
  return findings.length > 0 ? "finding" : "clear";
}

function detectorNextAction(state: ScanDetectorState): string {
  if (state === "blocked") return "Keep the release blocked until the target is reviewed.";
  if (state === "finding") return "Open the finding and attach a safe patch proposal.";
  if (state === "review") return "Capture a fresh snapshot before making a decision.";
  return "No action required for this detector.";
}

function detectorEvidence(definition: DetectorDefinition, findings: readonly DashboardFinding[]): readonly string[] {
  if (findings.length === 0) return definition.clearEvidence;
  return findings.flatMap((finding) => [finding.explanation, ...finding.blastRadius.explanation.split(".").filter(Boolean)]);
}

function detectorForDefinition(definition: DetectorDefinition, findings: readonly DashboardFinding[], previous: ReadonlyMap<ScanDetectorId, number>): ScanDetector {
  const matched = findings.filter((finding) => findingDetector(finding) === definition.id);
  const currentCount = matched.length;
  const previousCount = previous.get(definition.id) ?? currentCount;
  const state = detectorState(matched);
  return {
    ...definition,
    state,
    tone: detectorTone(matched),
    findingCount: currentCount,
    confidence: matched.length ? Math.min(...matched.map((finding) => finding.confidence)) : 1,
    currentCount,
    previousCount,
    delta: currentCount - previousCount,
    evidence: detectorEvidence(definition, matched),
    nextAction: detectorNextAction(state),
  };
}

function totalsFor(detectors: readonly ScanDetector[], findings: readonly DashboardFinding[]): ScanTotals {
  const criticalCount = findings.filter((finding) => finding.severity === "critical" || finding.severity === "high").length;
  const reviewCount = findings.filter((finding) => finding.severity === "medium").length;
  return {
    detectorCount: detectors.length,
    findingCount: findings.length,
    criticalCount,
    reviewCount,
    clearCount: detectors.filter((detector) => detector.state === "clear").length,
    coveragePercent: detectors.length ? Math.round(detectors.filter((detector) => detector.state !== "review").length / detectors.length * 100) : 0,
  };
}

function sessionTone(totals: ScanTotals): DashboardTone {
  return totals.criticalCount > 0 ? "red" : totals.findingCount > 0 ? "amber" : "green";
}

function sessionHeadline(totals: ScanTotals): string {
  if (totals.criticalCount > 0) return `${totals.criticalCount} critical finding${totals.criticalCount === 1 ? "" : "s"} block this release`;
  if (totals.findingCount > 0) return `${totals.findingCount} finding${totals.findingCount === 1 ? "" : "s"} need a human decision`;
  return "All supported detectors are clear";
}

function sessionExplanation(totals: ScanTotals, target: string): string {
  if (totals.criticalCount > 0) return `The ${target} scan found a release-blocking signal. Keep traffic bounded while the target evidence is reviewed.`;
  if (totals.findingCount > 0) return `The ${target} scan measured ${totals.findingCount} actionable signal. PATCHWORK keeps the change review-only until the evidence is acknowledged.`;
  return `The ${target} scan completed across ${totals.detectorCount} supported detectors with no actionable findings.`;
}

function sessionNextAction(totals: ScanTotals): ScanSession["nextAction"] {
  if (totals.criticalCount > 0) return "review";
  if (totals.findingCount > 0) return "patch";
  return "rescan";
}

export function buildScanSession(data: DashboardData, runCount = 1, reviewedFindingIds: readonly string[] = []): ScanSession {
  const findings = [...data.workspace.findings];
  const previous = new Map<ScanDetectorId, number>();
  const detectors = detectorDefinitions.map((definition) => detectorForDefinition(definition, findings, previous));
  const totals = totalsFor(detectors, findings);
  return {
    id: `scan_${data.site.id}_${String(runCount).padStart(2, "0")}`,
    status: "completed",
    source: "manual",
    target: `${data.site.name} / products / aurora`,
    viewport: "390 × 844",
    startedAt: scanStart,
    finishedAt: scanFinish,
    runCount,
    detectors,
    findings,
    reviewedFindingIds: [...reviewedFindingIds],
    totals,
    tone: sessionTone(totals),
    headline: sessionHeadline(totals),
    explanation: sessionExplanation(totals, `${data.site.name} product route`),
    nextAction: sessionNextAction(totals),
  };
}

export function rerunScanSession(session: ScanSession, findings: readonly DashboardFinding[] = session.findings): ScanSession {
  const previous = new Map(session.detectors.map((detector) => [detector.id, detector.currentCount] as const));
  const detectors = detectorDefinitions.map((definition) => detectorForDefinition(definition, findings, previous));
  const totals = totalsFor(detectors, findings);
  return {
    ...session,
    id: `${session.id.split("_").slice(0, -1).join("_")}_${String(session.runCount + 1).padStart(2, "0")}`,
    status: "completed",
    runCount: session.runCount + 1,
    startedAt: "2026-10-10T08:00:00.000Z",
    finishedAt: "2026-10-10T08:00:04.000Z",
    detectors,
    findings: [...findings],
    totals,
    tone: sessionTone(totals),
    headline: sessionHeadline(totals),
    explanation: sessionExplanation(totals, "ShopNest product route"),
    nextAction: sessionNextAction(totals),
  };
}

export function scanStatusLabel(status: ScanRunStatus): string {
  return status === "completed" ? "Scan completed" : status === "running" ? "Scanning now" : status === "queued" ? "Queued" : status === "failed" ? "Scan failed" : "Snapshot is stale";
}

export function scanStatusTone(status: ScanRunStatus): DashboardTone {
  return status === "completed" ? "green" : status === "failed" || status === "stale" ? "red" : "amber";
}

export function detectorStateLabel(state: ScanDetectorState): string {
  return state === "clear" ? "Clear" : state === "finding" ? "Finding" : state === "blocked" ? "Blocked" : "Review";
}

export function detectorStateTone(state: ScanDetectorState): DashboardTone {
  return state === "clear" ? "green" : state === "blocked" ? "red" : "amber";
}

export function detectorById(session: ScanSession, id: ScanDetectorId): ScanDetector | null {
  return session.detectors.find((detector) => detector.id === id) ?? null;
}

export function filterDetectors(session: ScanSession, query: string): ScanDetector[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return [...session.detectors];
  return session.detectors.filter((detector) => [detector.id, detector.label, detector.description, detector.route, ...detector.evidence].join(" ").toLowerCase().includes(normalized));
}

export function filterScanFindings(session: ScanSession, state: "all" | "open" | "reviewed" | "blocked"): DashboardFinding[] {
  const reviewed = new Set(session.reviewedFindingIds);
  if (state === "reviewed") return session.findings.filter((finding) => reviewed.has(finding.id));
  if (state === "open") return session.findings.filter((finding) => !reviewed.has(finding.id));
  if (state === "blocked") return session.findings.filter((finding) => finding.severity === "critical" || finding.severity === "high");
  return [...session.findings];
}

export function triageFinding(finding: DashboardFinding, reviewed = false): ScanTriage {
  if (finding.severity === "critical" || finding.severity === "high") return { tone: "red", state: "blocked", label: "Blocked", explanation: "The finding is too risky to move into a public release without a verified patch.", nextAction: "create-patch" };
  if (reviewed) return { tone: "green", state: "reviewed", label: "Reviewed", explanation: "A human has acknowledged the measured evidence and can continue to a constrained patch.", nextAction: "none" };
  if (finding.confidence < .9) return { tone: "amber", state: "needs-evidence", label: "Needs evidence", explanation: "The target confidence is below the safe review threshold. Capture a fresh snapshot before editing.", nextAction: "capture-evidence" };
  return { tone: "amber", state: "open", label: "Open review", explanation: "The finding has a strong target match but still needs a human decision before FIX.", nextAction: "review" };
}

export function compareScanSessions(previous: ScanSession, current: ScanSession): ScanComparison {
  const previousIds = new Set(previous.findings.map((finding) => finding.id));
  const currentIds = new Set(current.findings.map((finding) => finding.id));
  const newFindings = current.findings.filter((finding) => !previousIds.has(finding.id)).length;
  const resolvedFindings = previous.findings.filter((finding) => !currentIds.has(finding.id)).length;
  const unchangedFindings = current.findings.filter((finding) => previousIds.has(finding.id)).length;
  const previousDetectors = new Map(previous.detectors.map((detector) => [detector.id, detector.currentCount] as const));
  const detectorChanges = current.detectors.filter((detector) => detector.currentCount !== previousDetectors.get(detector.id)).map((detector) => ({ id: detector.id, label: detector.label, before: previousDetectors.get(detector.id) ?? 0, after: detector.currentCount, delta: detector.currentCount - (previousDetectors.get(detector.id) ?? 0) }));
  const tone: DashboardTone = newFindings > 0 ? "red" : resolvedFindings > 0 ? "green" : current.totals.findingCount > 0 ? "amber" : "green";
  const summary = newFindings > 0 ? `${newFindings} new finding${newFindings === 1 ? "" : "s"} appeared after the last scan.` : resolvedFindings > 0 ? `${resolvedFindings} finding${resolvedFindings === 1 ? "" : "s"} cleared; the remaining evidence is unchanged.` : "The scan result is unchanged, so no new patch should be drafted.";
  return { newFindings, resolvedFindings, unchangedFindings, detectorChanges, tone, summary };
}

export function scanExportRows(session: ScanSession): readonly Record<string, string | number>[] {
  return session.detectors.map((detector) => ({ detector: detector.id, label: detector.label, state: detectorStateLabel(detector.state), findings: detector.findingCount, confidence: `${Math.round(detector.confidence * 100)}%`, route: detector.route, nextAction: detector.nextAction }));
}

export function scanCsv(session: ScanSession): string {
  const columns = ["detector", "label", "state", "findings", "confidence", "route", "nextAction"] as const;
  const escape = (value: string | number) => `"${String(value).replaceAll('"', '""')}"`;
  return [columns.join(","), ...scanExportRows(session).map((row) => columns.map((column) => escape(row[column] ?? "")).join(","))].join("\n");
}

export function scanFilterSummary(session: ScanSession, state: "all" | "open" | "reviewed" | "blocked"): string {
  const count = filterScanFindings(session, state).length;
  return state === "all" ? `${count} finding${count === 1 ? "" : "s"} in this scan` : `${count} ${state} finding${count === 1 ? "" : "s"}`;
}
