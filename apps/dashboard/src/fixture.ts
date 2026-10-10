import type { DashboardData, WorkspaceReadModel } from "./dashboard-types";

const generatedAt = "2026-10-10T08:00:00.000Z";

const workspace: WorkspaceReadModel = {
  generatedAt,
  site: { id: "site_shopnest", name: "ShopNest", repository: "acme/shopnest-storefront", owner: { name: "Maya Singh", initials: "MS" } },
  stages: {
    scan: { stage: "scan", label: "SCAN", tone: "amber", score: 86, headline: "1 finding ready for review", explanation: "The Aurora price measures 4.48:1 contrast on a white surface. The scanner attached the foreground, background, and target evidence.", href: "/dashboard?view=scan", counts: { scans: 1, findings: 1, critical: 0 } },
    fix: { stage: "fix", label: "FIX", tone: "amber", score: 88, headline: "1 patch is ready to ship", explanation: "The approved contrast patch has a semantic target, a reversible style operation, and an open conflict note to acknowledge.", href: "/dashboard?view=patches", counts: { patches: 1, awaitingReview: 0, conflicts: 1, blocking: 0 } },
    ship: { stage: "ship", label: "SHIP", tone: "green", score: 100, headline: "Production is healthy", explanation: "The 25% canary is healthy. The release policy is eligible for rollout after the remaining review signals are acknowledged.", href: "/dashboard?view=releases", counts: { releases: 1, healthCritical: 0, healthDegraded: 0, canaryPercent: 25 } },
  },
  nextAction: { id: "review-scan-findings", stage: "scan", tone: "amber", label: "Review scan findings", explanation: "Read the measured contrast evidence before opening another patch.", href: "/dashboard?view=scan", priority: 80 },
  actions: [
    { id: "review-scan-findings", stage: "scan", tone: "amber", label: "Review scan findings", explanation: "Read the measured contrast evidence before opening another patch.", href: "/dashboard?view=scan", priority: 80 },
    { id: "review-release", stage: "ship", tone: "amber", label: "Review release risk", explanation: "The canary is healthy, but review evidence should be acknowledged before promotion.", href: "/dashboard?view=releases", priority: 70 },
  ],
  risk: { tone: "amber", score: 74, label: "Review before shipping", explanation: "The workspace is safe to inspect, but one scan finding and one conflict need a human decision.", factors: ["SCAN: 1 finding ready for review", "FIX: 1 conflict note is open"] },
  release: { id: "rel_20261010_03", version: "2026.10.10.3", title: "Readable pricing hotfix", status: "live", environment: "production", createdAt: "2026-10-10T07:30:00.000Z", publishedAt: "2026-10-10T07:45:00.000Z", rolledBackAt: null, rollout: { canaryPercent: 25, paused: false, killSwitch: { enabled: false } } },
  recentActivity: [
    { id: "activity_health_latency_01", timestamp: "2026-10-10T07:58:00.000Z", type: "health", title: "Health signal healthy", detail: "Median checkout latency is within the release policy.", severity: "info", subjectId: "rel_20261010_03" },
    { id: "activity_health_error_rate_01", timestamp: "2026-10-10T07:58:00.000Z", type: "health", title: "Health signal healthy", detail: "Checkout error rate is below the production canary threshold.", severity: "info", subjectId: "rel_20261010_03" },
    { id: "activity_review_price_contrast", timestamp: "2026-10-10T07:38:00.000Z", type: "review", title: "Patch review approved", detail: "The operation is constrained to the allowed color property and the verifier is green.", severity: "info", subjectId: "patch_price_contrast" },
    { id: "activity_patch_verified", timestamp: "2026-10-10T07:40:00.000Z", type: "audit", title: "patch verified", detail: "Verifier passed the published-versus-patched browser matrix.", severity: "info", subjectId: "patch_price_contrast" },
    { id: "activity_finding_price_contrast", timestamp: "2026-10-10T07:20:04.000Z", type: "finding", title: "Product price is difficult to read", detail: "The Aurora price measures 4.48:1 contrast on a white surface.", severity: "warning", subjectId: "finding_price_contrast" },
  ],
  findings: [{ id: "finding_price_contrast", summary: "Product price is difficult to read", explanation: "The Aurora price measures 4.48:1 contrast on a white surface; the current text size needs at least 4.5:1.", severity: "medium", confidence: .99, blastRadius: { elementCount: 1, pageCount: 1, explanation: "Only the rendered price in the Aurora product card is affected." } }],
  patches: [{ id: "patch_price_contrast", title: "Restore readable Aurora pricing", description: "Replaces the low-contrast price color while preserving the existing type scale and layout.", status: "verified", revision: 2, operationCount: 1, reviewerCount: 1, tags: ["accessibility", "shopnest", "canary-ready"], updatedAt: "2026-10-10T07:34:00.000Z", author: { name: "Maya Singh", initials: "MS" } }],
  policy: { status: "warning", nextAction: "Review warnings before increasing rollout." },
};

export const dashboardFixture: DashboardData = { site: { id: "site_shopnest", name: "ShopNest", repository: "acme/shopnest-storefront", environment: "production", releaseVersion: "2026.10.10.3", releaseTitle: "Readable pricing hotfix", owner: "Maya Singh" }, workspace, updatedAt: generatedAt, source: "seed" };

export function cloneFixture(): DashboardData {
  return structuredClone(dashboardFixture);
}
