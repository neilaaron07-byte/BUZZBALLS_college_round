import { randomUUID } from "node:crypto";
import { canonicalJson, createAuditEntry, healthEventSchema, patchSchema, scanPage, sha256, type AuditEntry, type Author, type Conflict, type HealthEvent, type Manifest, type Patch, type Release } from "../../../packages/core/src/index";
import { parseVerificationReport, type VerificationReport } from "../../../packages/verifier/src/index";
import { ApiError, notFound } from "./errors";
import { collaboratorRequestSchema, patchCreateRequestSchema, revisionCreateRequestSchema, reviewRequestSchema, scanRequestSchema } from "./contracts";
import { evaluateReleasePolicy, type ReleasePolicyResult } from "./policies";
import type { ApiContext, ApiState, Collaborator, PatchRevisionRecord, ReviewRecord, RolloutState, ScanRunRecord } from "./types";
import { activityFromState, conflictView, findingView, publicPatch, publicSite, releaseTimeline, reviewView, type ActivityItem } from "./normalizers";
import { checkStateInvariants, dependentPatches, unresolvedConflictsFor } from "./workflow";
import { filterByQuery } from "./query";
import { evaluatePatchPolicy, operationLabels, type PatchPolicyResult } from "./patch-policy";
import { decidePromotion, type RolloutDecision } from "./release-controller";
import { buildAuditReport, type AuditReport } from "./audit-report";
import { buildReleaseBundle, type ReleaseBundle } from "./release-bundle";
import { securitySummary } from "./security-summary";
import { detectorHealth, findingTrend, siteAnalytics, type SiteAnalytics } from "./analytics";
import { exportWorkspace, type WorkspaceExport } from "./exports";
import { domainEvents, eventCounts, type DomainEvent } from "./domain-events";
import { importSummary, mergeImportedState, validateImport, type ImportResult } from "./importer";

function nowIso(): string {
  return new Date().toISOString();
}

export async function readState(context: ApiContext): Promise<ApiState> {
  return context.repository.read();
}

export async function updateState<T>(context: ApiContext, mutator: (state: ApiState) => ApiState | Promise<ApiState>, select: (state: ApiState) => T): Promise<T> {
  const next = await context.repository.update(mutator);
  return select(next);
}

export function findSite(state: ApiState, siteId: string) {
  const site = state.sites.find((candidate) => candidate.id === siteId);
  if (!site) throw notFound("Site", siteId);
  return site;
}

export function findPatch(state: ApiState, patchId: string): Patch {
  const patch = state.patches.find((candidate) => candidate.identity.id === patchId);
  if (!patch) throw notFound("Patch", patchId);
  return patch;
}

export function findRelease(state: ApiState, releaseId: string): Release {
  const release = state.releases.find((candidate) => candidate.id === releaseId);
  if (!release) throw notFound("Release", releaseId);
  return release;
}

function findAuthor(state: ApiState, authorId: string): Author {
  const collaborator = state.collaborators.find((candidate) => candidate.author.id === authorId);
  if (!collaborator) throw notFound("Collaborator", authorId);
  return collaborator.author;
}

async function addAudit(state: ApiState, previous: AuditEntry | null, input: Omit<Parameters<typeof createAuditEntry>[0], "timestamp">): Promise<AuditEntry> {
  return createAuditEntry({ ...input, timestamp: nowIso() }, previous);
}

export async function createPatch(context: ApiContext, body: unknown): Promise<Patch> {
  const input = patchCreateRequestSchema.parse(body);
  const siteId = input.siteId;
  const authorId = input.authorId;
  const sitePatch = { title: input.title, description: input.description, operations: input.operations, dependencies: input.dependencies ?? [], reviewers: input.reviewers ?? [], tags: input.tags ?? [], siteId, authorId };
  const contentHash = await sha256(canonicalJson(sitePatch));
  return updateState(context, async (state) => {
    findSite(state, siteId);
    const author = findAuthor(state, authorId);
    const patchId = input.id ?? `patch_${randomUUID().replaceAll("-", "").slice(0, 12)}`;
    const patch = patchSchema.parse({ identity: { id: patchId, siteId, targetFingerprint: input.targetFingerprint, createdBy: authorId }, revision: { revision: 1, baseManifestHash: `sha256-${"a".repeat(64)}`, contentHash, createdAt: nowIso(), author, message: input.message ?? input.title }, title: input.title, description: input.description, status: "draft", operations: input.operations, dependencies: input.dependencies, reviewers: input.reviewers, tags: input.tags, createdAt: nowIso(), updatedAt: nowIso() });
    const audit = await addAudit(state, state.auditEntries.at(-1) ?? null, { id: `audit_${randomUUID().slice(0, 12)}`, action: "patch_created", actor: author, subjectId: patch.identity.id, details: { message: patch.revision.message } });
    return { ...state, patches: [...state.patches, patch], auditEntries: [...state.auditEntries, audit] };
  }, (state) => state.patches.at(-1) as Patch);
}

export async function runScan(context: ApiContext, body: unknown): Promise<ScanRunRecord> {
  const input = scanRequestSchema.parse(body);
  const snapshot = { ...input.snapshot, pageUrl: input.pageUrl };
  const findings = scanPage(snapshot);
  const scan: ScanRunRecord = { id: `scan_${randomUUID().replaceAll("-", "").slice(0, 12)}`, siteId: input.siteId, pageUrl: input.pageUrl, status: "completed", detectorCount: 6, findingIds: findings.map((finding) => finding.id), summary: findings.length === 0 ? "No supported scanner findings were detected." : `${findings.length} scanner finding${findings.length === 1 ? "" : "s"} needs review.`, snapshotHash: await sha256(canonicalJson(snapshot)), startedAt: nowIso(), finishedAt: nowIso(), error: null };
  return updateState(context, (state) => { findSite(state, input.siteId); return { ...state, scanRuns: [...state.scanRuns, scan], findings: [...state.findings.filter((finding) => !findings.some((candidate) => candidate.id === finding.id)), ...findings] }; }, (state) => state.scanRuns.find((candidate) => candidate.id === scan.id) as ScanRunRecord);
}

export async function createRevision(context: ApiContext, patchId: string, body: unknown): Promise<PatchRevisionRecord> {
  const input = revisionCreateRequestSchema.parse(body);
  return updateState(context, async (state) => {
    const patch = findPatch(state, patchId);
    if (patch.revision.revision !== input.baseRevision) throw new ApiError(409, "STALE_REVISION", `Patch is at revision ${patch.revision.revision}; refresh before creating revision ${input.baseRevision}.`);
    const author = findAuthor(state, input.authorId);
    const createdAt = nowIso();
    const contentHash = await sha256(canonicalJson({ patchId, baseRevision: input.baseRevision, operations: input.operations, message: input.message }));
    const revision: PatchRevisionRecord = { patchId, revision: patch.revision.revision + 1, contentHash, baseManifestHash: patch.revision.contentHash, message: input.message, authorId: author.id, createdAt };
    const updatedPatch = patchSchema.parse({ ...patch, revision: { ...patch.revision, revision: revision.revision, contentHash, baseManifestHash: revision.baseManifestHash, createdAt, author, message: input.message }, status: "draft", updatedAt: createdAt, operations: input.operations });
    return { ...state, patches: state.patches.map((candidate) => candidate.identity.id === patchId ? updatedPatch : candidate), patchRevisions: [...state.patchRevisions, revision] };
  }, (state) => state.patchRevisions.at(-1) as PatchRevisionRecord);
}

export async function updateCollaborator(context: ApiContext, siteId: string, body: unknown): Promise<Collaborator> {
  const input = collaboratorRequestSchema.parse(body);
  return updateState(context, (state) => { findSite(state, siteId); const existing = state.collaborators.find((collaborator) => collaborator.siteId === siteId && collaborator.author.id === input.authorId); if (!existing) throw notFound("Collaborator", input.authorId); const updated = { ...existing, role: input.role }; return { ...state, collaborators: state.collaborators.map((candidate) => candidate.id === existing.id ? updated : candidate) }; }, (state) => state.collaborators.find((collaborator) => collaborator.siteId === siteId && collaborator.author.id === input.authorId) as Collaborator);
}

export async function getReleasePolicy(context: ApiContext, releaseId: string): Promise<ReleasePolicyResult> {
  const state = await readState(context);
  return evaluateReleasePolicy(state, findRelease(state, releaseId));
}

export async function getDashboardOverview(context: ApiContext, siteId: string): Promise<unknown> {
  const state = await readState(context);
  const site = findSite(state, siteId);
  const patches = state.patches.filter((patch) => patch.identity.siteId === siteId);
  const releases = state.releases.filter((release) => release.siteId === siteId);
  const openFindings = state.findings.map(findingView);
  const openConflicts = state.conflicts.filter((conflict) => conflict.resolvedAt === null).map(conflictView);
  const activity = activityFromState(state, siteId).slice(0, 12);
  return { site: publicSite(site), counts: { findings: openFindings.length, conflicts: openConflicts.length, patches: patches.length, releases: releases.length, collaborators: state.collaborators.filter((collaborator) => collaborator.siteId === siteId).length }, patches: patches.map((patch) => publicPatch(patch, state.collaborators)), releases: releaseTimeline(releases, state.rollouts), findings: openFindings, conflicts: openConflicts, activity };
}

export async function getSiteActivity(context: ApiContext, siteId: string, query?: string): Promise<readonly ActivityItem[]> {
  const state = await readState(context);
  findSite(state, siteId);
  return filterByQuery(activityFromState(state, siteId), query, ["title", "detail", "subjectId"]);
}

export async function getPatchImpact(context: ApiContext, patchId: string): Promise<unknown> {
  const state = await readState(context);
  const patch = findPatch(state, patchId);
  const conflicts = unresolvedConflictsFor(state, new Set([patchId])).map(conflictView);
  const dependents = dependentPatches(state, patchId).map((candidate) => publicPatch(candidate, state.collaborators));
  const releases = state.releases.filter((release) => release.manifest.patchHashes.includes(patch.revision.contentHash)).map((release) => releaseTimeline([release], state.rollouts)[0]);
  return { patch: publicPatch(patch, state.collaborators), affectedPages: 1, affectedElements: patch.operations.length, affectedViewports: 3, conflicts, dependents, releases, explanation: conflicts.length > 0 ? "This patch has unresolved conflicts that can affect its release path." : "The patch has no unresolved conflict on its known dependency path." };
}

export async function searchWorkspace(context: ApiContext, query: string): Promise<unknown> {
  const state = await readState(context);
  const normalized = query.trim();
  if (normalized.length < 2) throw new ApiError(400, "QUERY_TOO_SHORT", "Search needs at least two characters.");
  return { query: normalized, sites: filterByQuery(state.sites, normalized, ["id", "name", "repository"]).map(publicSite), patches: state.patches.filter((patch) => patch.title.toLocaleLowerCase().includes(normalized.toLocaleLowerCase()) || patch.description.toLocaleLowerCase().includes(normalized.toLocaleLowerCase())).map((patch) => publicPatch(patch, state.collaborators)), findings: state.findings.filter((finding) => `${finding.summary} ${finding.explanation}`.toLocaleLowerCase().includes(normalized.toLocaleLowerCase())).map(findingView), releases: state.releases.filter((release) => `${release.id} ${release.title} ${release.summary}`.toLocaleLowerCase().includes(normalized.toLocaleLowerCase())).map((release) => releaseTimeline([release], state.rollouts)[0]) };
}

export async function diagnostics(context: ApiContext): Promise<unknown> {
  const state = await readState(context);
  return { checks: checkStateInvariants(state), generatedAt: nowIso(), collections: { sites: state.sites.length, environments: state.environments.length, scans: state.scanRuns.length, patches: state.patches.length, revisions: state.patchRevisions.length, releases: state.releases.length, findings: state.findings.length, conflicts: state.conflicts.length, reviews: state.reviews.length, verificationReports: state.verificationReports.length, healthEvents: state.healthEvents.length, auditEntries: state.auditEntries.length } };
}

export async function getReviews(context: ApiContext): Promise<readonly (Omit<ReviewRecord, "author"> & { author: import("./normalizers").PublicAuthor })[]> {
  const state = await readState(context);
  return state.reviews.map(reviewView);
}

export async function getPatchPolicy(context: ApiContext, patchId: string): Promise<PatchPolicyResult> {
  const state = await readState(context);
  return evaluatePatchPolicy(state, findPatch(state, patchId));
}

export async function getReleasePromotion(context: ApiContext, releaseId: string, percent: number): Promise<RolloutDecision> {
  const state = await readState(context);
  return decidePromotion(state, releaseId, percent);
}

export async function getReleaseBundle(context: ApiContext, releaseId: string): Promise<ReleaseBundle> {
  const bundle = await buildReleaseBundle(await readState(context), releaseId);
  if (!bundle) throw notFound("Release", releaseId);
  return bundle;
}

export async function getAuditReport(context: ApiContext): Promise<AuditReport> {
  return buildAuditReport(await readState(context));
}

export async function getSecuritySummary(context: ApiContext): Promise<ReturnType<typeof securitySummary>> {
  return securitySummary(await readState(context));
}

export function patchOperationSummary(patch: Patch): { count: number; labels: readonly string[] } {
  return { count: patch.operations.length, labels: operationLabels(patch) };
}

export async function getSiteAnalytics(context: ApiContext, siteId: string): Promise<SiteAnalytics> {
  const state = await readState(context);
  findSite(state, siteId);
  return siteAnalytics(state, siteId);
}

export async function getFindingTrend(context: ApiContext, siteId: string): Promise<unknown> {
  const state = await readState(context);
  findSite(state, siteId);
  return { trend: findingTrend(state, siteId), detectorHealth: detectorHealth(state) };
}

export async function getDomainEvents(context: ApiContext, siteId?: string): Promise<{ events: readonly DomainEvent[]; counts: Readonly<Record<import("./domain-events").DomainEventName, number>> }> {
  const state = await readState(context);
  const events = domainEvents(state).filter((event) => !siteId || state.sites.some((site) => site.id === siteId && (state.patches.some((patch) => patch.identity.id === event.subjectId) || state.releases.some((release) => release.id === event.subjectId))));
  return { events, counts: eventCounts(events) };
}

export async function getWorkspaceExport(context: ApiContext, siteId: string): Promise<WorkspaceExport> {
  const exportData = await exportWorkspace(await readState(context), siteId);
  if (!exportData) throw notFound("Site", siteId);
  return exportData;
}

export async function validateWorkspaceImport(input: unknown): Promise<ImportResult & { summary: string }> {
  const result = validateImport(input);
  return { ...result, summary: importSummary(result) };
}

export async function importWorkspace(context: ApiContext, input: unknown): Promise<ImportResult & { summary: string }> {
  const result = validateImport(input);
  if (!result.accepted) return { ...result, summary: importSummary(result) };
  await updateState(context, (state) => mergeImportedState(state, input), (state) => state);
  return { ...result, summary: importSummary(result) };
}

export async function addReview(context: ApiContext, patchId: string, body: unknown): Promise<ReviewRecord> {
  const input = reviewRequestSchema.parse(body);
  return updateState(context, async (state) => {
    const patch = findPatch(state, patchId);
    const author = findAuthor(state, typeof input.authorId === "string" ? input.authorId : "");
    const review: ReviewRecord = { id: `review_${randomUUID().slice(0, 12)}`, patchId, author, decision: input.decision, note: input.note, createdAt: nowIso() };
    const nextStatus = review.decision === "approved" ? "review" : review.decision === "rejected" ? "rejected" : "draft";
    const nextPatch = { ...patch, status: nextStatus as Patch["status"], updatedAt: review.createdAt };
    const audit = await addAudit(state, state.auditEntries.at(-1) ?? null, { id: `audit_${randomUUID().slice(0, 12)}`, action: "patch_reviewed", actor: author, subjectId: patchId, details: { decision: review.decision, note: review.note } });
    return { ...state, reviews: [...state.reviews, review], patches: state.patches.map((candidate) => candidate.identity.id === patchId ? nextPatch : candidate), auditEntries: [...state.auditEntries, audit] };
  }, (state) => state.reviews.at(-1) as ReviewRecord);
}

export async function resolveConflict(context: ApiContext, conflictId: string, body: unknown): Promise<Conflict> {
  const input = body as Record<string, unknown>;
  return updateState(context, async (state) => {
    const conflict = state.conflicts.find((candidate) => candidate.id === conflictId);
    if (!conflict) throw notFound("Conflict", conflictId);
    const author = findAuthor(state, typeof input.authorId === "string" ? input.authorId : "");
    if (conflict.severity === "blocking" && input.action !== "merge" && input.action !== "archive") throw new ApiError(409, "CONFLICT_REQUIRES_ACTION", "A blocking conflict requires an explicit merge or archive action.");
    const updated = { ...conflict, resolvedAt: nowIso(), resolvedBy: author.id };
    const audit = await addAudit(state, state.auditEntries.at(-1) ?? null, { id: `audit_${randomUUID().slice(0, 12)}`, action: "conflict_resolved", actor: author, subjectId: conflict.id, details: { action: String(input.action ?? "resolved"), suggestedResolution: conflict.suggestedResolution } });
    return { ...state, conflicts: state.conflicts.map((candidate) => candidate.id === conflictId ? updated : candidate), auditEntries: [...state.auditEntries, audit] };
  }, (state) => state.conflicts.find((candidate) => candidate.id === conflictId) as Conflict);
}

export async function createPreview(context: ApiContext, patchId: string, ttlMinutes = 30): Promise<{ patchId: string; manifest: Manifest; expiresAt: string; previewUrl: string }> {
  let preview: { patchId: string; manifest: Manifest; expiresAt: string; previewUrl: string } | null = null;
  await updateState(context, async (state) => {
    const patch = findPatch(state, patchId);
    const release = state.releases.find((candidate) => candidate.environment === "production" && candidate.status === "live");
    if (!release) throw new ApiError(409, "NO_LIVE_RELEASE", "A live release is required to create a private preview.");
    const expiresAt = new Date(Date.now() + Math.min(120, Math.max(5, ttlMinutes)) * 60_000).toISOString();
    const manifest: Manifest = { version: 1, siteId: patch.identity.siteId, releaseId: `preview_${patch.identity.id}`, environment: "preview", baseHash: release.manifest.baseHash, patchHashes: [patch.revision.contentHash], createdAt: nowIso(), expiresAt, killSwitch: { enabled: false, reason: null, enabledAt: null, enabledBy: null } };
    preview = { patchId, manifest, expiresAt, previewUrl: `https://preview.patchwork.example/${patch.identity.id}?expires=${encodeURIComponent(expiresAt)}` };
    return state;
  }, (state) => state);
  if (!preview) throw new ApiError(500, "PREVIEW_NOT_CREATED", "PATCHWORK could not create the private preview.");
  return preview;
}

export async function storeVerification(context: ApiContext, reportInput: unknown): Promise<VerificationReport> {
  const report = parseVerificationReport(reportInput);
  return updateState(context, (state) => ({ ...state, verificationReports: [...state.verificationReports.filter((candidate) => candidate.id !== report.id), report] }), (state) => state.verificationReports.find((candidate) => candidate.id === report.id) as VerificationReport);
}

export async function publishRelease(context: ApiContext, releaseId: string): Promise<Release> {
  return releaseTransition(context, releaseId, "publish");
}

export async function releaseTransition(context: ApiContext, releaseId: string, action: "publish" | "promote" | "pause" | "rollback"): Promise<Release> {
  return updateState(context, async (state) => {
    const release = findRelease(state, releaseId);
    const author = state.collaborators[0]?.author;
    if (!author) throw new ApiError(500, "NO_OWNER", "The seeded workspace has no release owner.");
    if (action === "publish" || action === "promote") {
      const policy = evaluateReleasePolicy(state, release);
      if (policy.status === "blocked") throw new ApiError(409, "RELEASE_POLICY_BLOCKED", policy.nextAction, policy.checks.filter((check) => check.status === "failed"));
    }
    if (action === "rollback") {
      const previous = state.releases.find((candidate) => candidate.environment === release.environment && candidate.id !== release.id && candidate.status === "rolled_back");
      const updated = { ...release, status: "rolled_back" as const, rolledBackAt: nowIso() };
      const audit = await addAudit(state, state.auditEntries.at(-1) ?? null, { id: `audit_${randomUUID().slice(0, 12)}`, action: "release_rolled_back", actor: author, subjectId: release.id, details: { restoredReleaseId: previous?.id ?? "none", message: "Rollback requested by release control." } });
      return { ...state, releases: state.releases.map((candidate) => candidate.id === release.id ? updated : candidate), environments: state.environments.map((environment) => environment.releaseId === release.id ? { ...environment, releaseId: previous?.id ?? null } : environment), auditEntries: [...state.auditEntries, audit] };
    }
    const nextStatus = action === "pause" ? "scheduled" : "live";
    const updated = { ...release, status: nextStatus as Release["status"], publishedAt: release.publishedAt ?? nowIso() };
    const audit = await addAudit(state, state.auditEntries.at(-1) ?? null, { id: `audit_${randomUUID().slice(0, 12)}`, action: "release_published", actor: author, subjectId: release.id, details: { action, message: action === "promote" ? "Promoted from canary to full rollout." : action === "pause" ? "Rollout paused for review." : "Release published." } });
    return { ...state, releases: state.releases.map((candidate) => candidate.id === release.id ? updated : candidate), environments: action === "publish" || action === "promote" ? state.environments.map((environment) => environment.name === release.environment && environment.siteId === release.siteId ? { ...environment, releaseId: release.id } : environment) : state.environments, auditEntries: [...state.auditEntries, audit] };
  }, (state) => state.releases.find((candidate) => candidate.id === releaseId) as Release);
}

export async function updateRollout(context: ApiContext, releaseId: string, patch: Partial<Pick<RolloutState, "canaryPercent" | "paused">>): Promise<RolloutState> {
  return updateState(context, (state) => {
    findRelease(state, releaseId);
    const current = state.rollouts.find((rollout) => rollout.releaseId === releaseId) ?? { releaseId, canaryPercent: 0, paused: false, killSwitch: { enabled: false, reason: null, enabledAt: null, enabledBy: null }, updatedAt: nowIso() };
    const updated = { ...current, ...patch, canaryPercent: Math.max(0, Math.min(100, patch.canaryPercent ?? current.canaryPercent)), updatedAt: nowIso() };
    return { ...state, rollouts: [...state.rollouts.filter((rollout) => rollout.releaseId !== releaseId), updated] };
  }, (state) => state.rollouts.find((rollout) => rollout.releaseId === releaseId) as RolloutState);
}

export async function updateKillSwitch(context: ApiContext, releaseId: string, enabled: boolean, reason: string | null): Promise<RolloutState> {
  return updateState(context, (state) => {
    const release = findRelease(state, releaseId);
    const author = state.collaborators[0]?.author;
    if (!author) throw new ApiError(500, "NO_OWNER", "The seeded workspace has no release owner.");
    const current = state.rollouts.find((rollout) => rollout.releaseId === releaseId) ?? { releaseId, canaryPercent: 0, paused: false, killSwitch: { enabled: false, reason: null, enabledAt: null, enabledBy: null }, updatedAt: nowIso() };
    const killSwitch = { enabled, reason: enabled ? reason ?? "Kill switch enabled by release control." : null, enabledAt: enabled ? nowIso() : null, enabledBy: enabled ? author.id : null };
    const updated = { ...current, killSwitch, paused: enabled ? true : current.paused, updatedAt: nowIso() };
    const auditPromise = addAudit(state, state.auditEntries.at(-1) ?? null, { id: `audit_${randomUUID().slice(0, 12)}`, action: "kill_switch_changed", actor: author, subjectId: release.id, details: { enabled: String(enabled), reason: killSwitch.reason ?? "disabled" } });
    return auditPromise.then((audit) => ({ ...state, rollouts: [...state.rollouts.filter((rollout) => rollout.releaseId !== releaseId), updated], auditEntries: [...state.auditEntries, audit] }));
  }, (state) => state.rollouts.find((rollout) => rollout.releaseId === releaseId) as RolloutState);
}

export async function ingestHealthEvent(context: ApiContext, input: unknown): Promise<{ event: HealthEvent; automaticRollback: boolean; release: Release | null }> {
  const event = healthEventSchema.parse(input);
  let automaticRollback = false;
  const state = await updateState(context, async (state) => {
    let nextState = { ...state, healthEvents: [...state.healthEvents, event] };
    const release = state.releases.find((candidate) => candidate.id === event.releaseId) ?? null;
    if (release && event.status === "critical" && event.threshold !== null && event.value >= event.threshold) {
      automaticRollback = true;
      nextState = await releaseTransitionState(nextState, release.id, "health threshold crossed");
    }
    return nextState;
  }, (nextState) => nextState);
  return { event, automaticRollback, release: state.releases.find((candidate) => candidate.id === event.releaseId) ?? null };
}

async function releaseTransitionState(state: ApiState, releaseId: string, message: string): Promise<ApiState> {
  const release = findRelease(state, releaseId);
  const author = state.collaborators[0]?.author;
  if (!author) return state;
  const updated = { ...release, status: "rolled_back" as const, rolledBackAt: nowIso() };
  const audit = await addAudit(state, state.auditEntries.at(-1) ?? null, { id: `audit_${randomUUID().slice(0, 12)}`, action: "release_rolled_back", actor: author, subjectId: release.id, details: { message } });
  return { ...state, releases: state.releases.map((candidate) => candidate.id === releaseId ? updated : candidate), auditEntries: [...state.auditEntries, audit] };
}
