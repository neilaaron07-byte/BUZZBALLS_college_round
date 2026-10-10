import { createAuditEntry, patchSchema, releaseSchema, siteSchema, environmentSchema, type AuditEntry, type Author, type Conflict, type Manifest, type Patch, type Release, type ScanFinding, type Site, type Environment, type HealthEvent } from "../../../packages/core/src/index";
import type { VerificationReport } from "../../../packages/verifier/src/index";
import type { ApiState, Collaborator, GithubPullRequest, ReviewRecord, RolloutState } from "./types";

export const SEED_NOW = "2026-10-10T08:00:00.000Z";
const HASH_A = `sha256-${"a".repeat(64)}` as const;
const HASH_B = `sha256-${"b".repeat(64)}` as const;
const HASH_C = `sha256-${"c".repeat(64)}` as const;
const HASH_D = `sha256-${"d".repeat(64)}` as const;

export const seedAuthors: readonly [Author, Author, Author] = [
  { id: "usr_maya_singh", name: "Maya Singh", email: "maya@patchwork.example" },
  { id: "usr_jon_bell", name: "Jon Bell", email: "jon@patchwork.example" },
  { id: "usr_lena_ortiz", name: "Lena Ortiz", email: "lena@patchwork.example" },
];

function createSite(): Site {
  return siteSchema.parse({ id: "site_shopnest", name: "ShopNest", canonicalOrigin: "https://shopnest.example/", repository: "acme/shopnest-storefront", defaultBranch: "main", createdAt: "2026-08-14T09:30:00.000Z", owner: seedAuthors[0] });
}

function createEnvironments(site: Site): Environment[] {
  return [
    environmentSchema.parse({ id: "env_shopnest_preview", siteId: site.id, name: "preview", origin: "https://preview.shopnest.example/", releaseId: "rel_20261010_preview", protected: false, createdAt: "2026-08-14T09:30:00.000Z" }),
    environmentSchema.parse({ id: "env_shopnest_staging", siteId: site.id, name: "staging", origin: "https://staging.shopnest.example/", releaseId: "rel_20261009_staging", protected: true, createdAt: "2026-08-14T09:30:00.000Z" }),
    environmentSchema.parse({ id: "env_shopnest_production", siteId: site.id, name: "production", origin: "https://shopnest.example/", releaseId: "rel_20261010_03", protected: true, createdAt: "2026-08-14T09:30:00.000Z" }),
  ];
}

function createPatch(site: Site): Patch {
  return patchSchema.parse({
    identity: { id: "patch_price_contrast", siteId: site.id, targetFingerprint: HASH_B, createdBy: seedAuthors[0].id },
    revision: { revision: 2, baseManifestHash: HASH_A, contentHash: HASH_C, createdAt: "2026-10-10T07:34:00.000Z", author: seedAuthors[0], message: "Increase product price contrast to meet the storefront accessibility threshold." },
    title: "Restore readable Aurora pricing",
    description: "Replaces the low-contrast price color while preserving the existing type scale and layout.",
    status: "verified",
    operations: [{ id: "op_price_color", kind: "style", target: { fingerprint: HASH_B, fallbackLabel: "Aurora price", expectedTag: "p" }, property: "color", value: "#172033" }],
    dependencies: [],
    reviewers: [seedAuthors[1]],
    tags: ["accessibility", "shopnest", "canary-ready"],
    createdAt: "2026-10-10T07:12:00.000Z",
    updatedAt: "2026-10-10T07:34:00.000Z",
  });
}

function createManifest(siteId: string, releaseId: string, environment: Manifest["environment"], patchHashes: readonly string[]): Manifest {
  return { version: 1, siteId, releaseId, environment, baseHash: HASH_A, patchHashes: [...patchHashes] as Manifest["patchHashes"], createdAt: "2026-10-10T07:30:00.000Z", expiresAt: "2026-10-11T07:30:00.000Z", killSwitch: { enabled: false, reason: null, enabledAt: null, enabledBy: null } };
}

function createReleases(site: Site, patch: Patch): Release[] {
  const previous = releaseSchema.parse({ id: "rel_20261009_02", siteId: site.id, environment: "production", version: "2026.10.09.2", title: "Checkout resilience", summary: "Restored checkout focus order after the mobile navigation update.", status: "rolled_back", manifest: createManifest(site.id, "rel_20261009_02", "production", [HASH_D]), author: seedAuthors[1], createdAt: "2026-10-09T16:10:00.000Z", publishedAt: "2026-10-09T16:20:00.000Z", rolledBackAt: "2026-10-10T06:42:00.000Z" });
  const current = releaseSchema.parse({ id: "rel_20261010_03", siteId: site.id, environment: "production", version: "2026.10.10.3", title: "Readable pricing hotfix", summary: "Ships the verified Aurora price contrast patch behind a cautious canary.", status: "live", manifest: createManifest(site.id, "rel_20261010_03", "production", [patch.revision.contentHash]), author: seedAuthors[0], createdAt: "2026-10-10T07:30:00.000Z", publishedAt: "2026-10-10T07:45:00.000Z", rolledBackAt: null });
  const preview = releaseSchema.parse({ id: "rel_20261010_preview", siteId: site.id, environment: "preview", version: "2026.10.10.preview.1", title: "Aurora price preview", summary: "Private preview for the price contrast patch.", status: "verified", manifest: createManifest(site.id, "rel_20261010_preview", "preview", [patch.revision.contentHash]), author: seedAuthors[0], createdAt: "2026-10-10T07:36:00.000Z", publishedAt: null, rolledBackAt: null });
  return [previous, current, preview];
}

function createFinding(): ScanFinding {
  return { id: "finding_price_contrast", detector: "contrast", severity: "medium", confidence: 0.99, targetIds: ["price-aurora"], summary: "Product price is difficult to read", explanation: "The Aurora price measures 4.48:1 contrast on a white surface; the current text size needs at least 4.5:1.", evidence: ["Foreground #777777", "Background #ffffff", "Measured ratio 4.48:1"], blastRadius: { elementCount: 1, pageCount: 1, explanation: "Only the rendered price in the Aurora product card is affected." } };
}

function createConflict(): Conflict {
  return { id: "conflict_price_color", patchId: "patch_price_contrast", kind: "property", severity: "warning", targetFingerprint: HASH_B, explanation: "An older draft also changes the Aurora price color on the same semantic target.", suggestedResolution: "Keep the verified revision and archive the older draft before publishing another patch.", leftRevision: 1, rightRevision: 2, resolvedAt: null, resolvedBy: null };
}

function createHealthEvents(): HealthEvent[] {
  return [
    { id: "health_error_rate_01", releaseId: "rel_20261010_03", type: "error_rate", status: "healthy", observedAt: "2026-10-10T07:58:00.000Z", value: 0.4, threshold: 2, explanation: "Checkout error rate is below the production canary threshold." },
    { id: "health_latency_01", releaseId: "rel_20261010_03", type: "latency", status: "healthy", observedAt: "2026-10-10T07:58:00.000Z", value: 280, threshold: 600, explanation: "Median checkout latency is within the release policy." },
  ];
}

function createReport(): VerificationReport {
  return { schemaVersion: 1, id: "verify_rel_20261010_03", createdAt: "2026-10-10T07:40:00.000Z", publishedUrl: "https://shopnest.example/", patchedUrl: "https://preview.shopnest.example/", viewports: [{ id: "desktop", width: 1440, height: 900 }, { id: "tablet", width: 1024, height: 900 }, { id: "mobile", width: 390, height: 844 }], checks: [{ id: "load-production", kind: "load", label: "Page load", status: "passed", blocking: true, explanation: "Published and patched pages loaded successfully.", durationMs: 420, evidence: ["HTTP 200"] }, { id: "checkout-interaction", kind: "interaction", label: "Checkout flow", status: "passed", blocking: true, explanation: "The Add to cart and Checkout actions remain available.", durationMs: 88, evidence: ["Add to cart visible", "Checkout visible"] }], screenshots: [], score: 100, status: "passed", summary: "All blocking verification checks passed." };
}

export async function createSeedState(): Promise<ApiState> {
  const site = createSite();
  const environments = createEnvironments(site);
  const patch = createPatch(site);
  const releases = createReleases(site, patch);
  const findings = [createFinding()];
  const conflicts = [createConflict()];
  const collaborators: Collaborator[] = seedAuthors.map((author, index) => ({ id: `collab_${author.id}`, siteId: site.id, author, role: index === 0 ? "owner" : index === 1 ? "reviewer" : "editor", joinedAt: "2026-08-15T10:00:00.000Z" }));
  const reviews: ReviewRecord[] = [{ id: "review_price_contrast", patchId: patch.identity.id, author: seedAuthors[1], decision: "approved", note: "The value is constrained to the allowed color property and the verifier is green.", createdAt: "2026-10-10T07:38:00.000Z" }];
  const rollouts: RolloutState[] = [{ releaseId: "rel_20261010_03", canaryPercent: 25, paused: false, killSwitch: { enabled: false, reason: null, enabledAt: null, enabledBy: null }, updatedAt: "2026-10-10T07:50:00.000Z" }];
  const pullRequests: GithubPullRequest[] = [{ id: "pr_482", number: 482, title: "fix: restore readable Aurora pricing", branch: "patchwork/price-contrast", authorId: seedAuthors[0].id, state: "open", checks: [{ name: "Playwright verifier", status: "passed", detail: "32 browser and unit checks passed." }, { name: "Accessibility", status: "passed", detail: "No serious Axe violations in the preview." }], reviewers: [seedAuthors[1].id], updatedAt: "2026-10-10T07:42:00.000Z" }];
  const audits: AuditEntry[] = [];
  for (const input of [
    { id: "audit_patch_created", action: "patch_created" as const, subjectId: patch.identity.id, actor: seedAuthors[0], details: { message: "Created from the Aurora contrast scan finding." } },
    { id: "audit_patch_verified", action: "patch_verified" as const, subjectId: patch.identity.id, actor: seedAuthors[1], details: { message: "Verifier passed the published-versus-patched browser matrix." } },
    { id: "audit_release_published", action: "release_published" as const, subjectId: "rel_20261010_03", actor: seedAuthors[0], details: { message: "Published at 25% canary after approval." } },
  ]) audits.push(await createAuditEntry({ ...input, timestamp: input.id === "audit_release_published" ? "2026-10-10T07:45:00.000Z" : input.id === "audit_patch_verified" ? "2026-10-10T07:40:00.000Z" : "2026-10-10T07:34:00.000Z" }, audits.at(-1) ?? null));
  return { schemaVersion: 1, sites: [site], environments, collaborators, patches: [patch], findings, conflicts, reviews, scanRuns: [{ id: "scan_20261010_01", siteId: site.id, pageUrl: "https://shopnest.example/products/aurora", status: "completed", detectorCount: 6, findingIds: findings.map((finding) => finding.id), summary: "One contrast finding needs review on the Aurora product price.", snapshotHash: HASH_D, startedAt: "2026-10-10T07:20:00.000Z", finishedAt: "2026-10-10T07:20:04.000Z", error: null }], patchRevisions: [{ patchId: patch.identity.id, revision: patch.revision.revision, contentHash: patch.revision.contentHash, baseManifestHash: patch.revision.baseManifestHash, message: patch.revision.message, authorId: patch.revision.author.id, createdAt: patch.revision.createdAt }], previews: [], releases, rollouts, verificationReports: [createReport()], healthEvents: createHealthEvents(), auditEntries: audits, pullRequests, metrics: { requests: 0, errors: 0, idempotentReplays: 0, bytesRejected: 0, startedAt: SEED_NOW } };
}
