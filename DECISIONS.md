# PATCHWORK Decisions

This file records choices that affect implementation or the demo contract. Each
decision is intentionally reversible until the associated gate passes.

## D-001 — Preserve the vinext and Sites runtime

Decision: retain the existing package manager, lockfile, vinext build, Worker
entrypoint, and `.openai/hosting.json` project metadata while introducing npm
workspaces around them.

Reason: the current deployment is already a working private Site. Preserving
the runtime keeps deployment risk separate from the product rebuild and honors
the Cloudflare-compatible constraint.

## D-002 — Separate the product surfaces by workspace package

Decision: use `apps/dashboard`, `apps/web`, `apps/shopnest`, and `apps/api` for
surface ownership, with `packages/core`, `sdk`, `extension`, `verifier`, and
`ai` for reusable behavior. The existing root app remains the transitional
entrypoint until the dashboard and marketing routes are runnable.

Reason: the product has different performance, security, and information
architecture needs. One large app would make the dashboard and demo harder to
test and would encourage a second visual language.

## D-003 — Use Motion for interaction choreography

Decision: standardize on the `motion` package rather than mixing animation
libraries. The public API will be wrapped by small PATCHWORK motion helpers so
reduced-motion behavior is consistent.

Reason: the brief calls for Motion or Framer Motion, and a small wrapper keeps
the design system portable while centralizing duration, easing, and spring
values.

## D-004 — Use CSS variables as the source of truth

Decision: author tokens once as typed source data, emit CSS variables, and map
Tailwind utilities to those variables. Component styles may compose tokens but
may not introduce a second color or spacing scale.

Reason: theme transitions, contrast checks, screenshot review, and future
workspace consumers all need the same values.

## D-005 — Precision over recall for target resolution

Decision: an ambiguous or low-confidence target is blocked with an explanation;
PATCHWORK never silently applies a best guess. Auto-heal remains a reviewable
proposal until the resolver margin is safe.

Reason: the product promise is safe hotfixing. A missed fix is visible and
recoverable; a wrong-element mutation can damage customer trust.

## D-011 — Keep resolver thresholds explicit and reviewable

Decision: exact matches require 0.96 confidence, recovered moved targets require
0.72 confidence plus a 0.10 runner-up margin, and ambiguous or weak matches
return no target id.

Reason: the UI can explain and review a conservative recovery, while the
runtime cannot accidentally apply a low-confidence guess.

## D-012 — Use Web Crypto for release integrity

Decision: canonical content hashes and Ed25519 signatures use `globalThis.crypto`
and Web Crypto-compatible encodings rather than Node-only crypto imports.

Reason: the same core package must run in Cloudflare Workers, the browser SDK,
the verifier, and Node-based tests without duplicating signing logic.

## D-013 — Make scanning pure before making it browser-aware

Decision: scanner detectors accept a serializable page snapshot and return
typed findings with severity, confidence, evidence, and blast radius. Browser
collection is a later boundary.

Reason: deterministic fixtures make detector behavior testable and portable;
the verifier can later populate the same snapshot from an isolated page.

## D-014 — Keep the SDK portable and small

Decision: the browser runtime imports only portable core algorithms and uses
lightweight structural guards; it does not bundle the full Zod authoring layer.
The emitted minified artifact is measured with esbuild and gzip in
`npm run sdk:size`.

Reason: the SDK must run on arbitrary customer pages without dashboard code or
third-party runtime dependencies. The schema boundary remains authoritative in
core and server-side consumers, while the browser still fails closed on unsafe
operations and malformed manifests.

## D-015 — Keep extension edits preview-only until dashboard handoff

Decision: the MV3 inspector owns selection, local visual edits, undo/redo, and
stateful draft intent, but it does not publish or mutate production state. Save,
dashboard, and private-preview actions cross the connection protocol boundary.

Reason: the extension runs inside arbitrary customer pages and must remain
recoverable even when the workspace is offline; release policy belongs in the
dashboard and API surfaces.

## D-016 — Verify published and patched pages in separate browser contexts

Decision: the verifier opens the published and patched URLs in isolated
Playwright contexts for every configured viewport, attaches console and network
listeners before navigation, and stores portable report metadata plus local
screenshots.

Reason: separate contexts prevent cookies, storage, and service-worker state
from leaking between baselines. Attaching listeners before navigation catches
load-time regressions, while portable evidence keeps the committed fixture
reviewable outside the originating machine.

## D-017 — Make PatchPilot evidence-first with an offline default

Decision: PatchPilot responses must carry typed evidence items, confidence, and
one safe next action. The local provider derives output from scanner, resolver,
verification, health, and release signals; optional providers sit behind an
adapter and fall back to the same offline engine on failure.

Reason: the demo must be useful without credentials and must not turn a model
guess into a production mutation. Keeping the proposal review-only also makes
auto-heal explainable and preserves the one-click rollback promise.

## D-018 — Use an atomic JSON repository for the local API milestone

Decision: the local API stores its deterministic demo state in a JSON
repository that writes a temporary file, keeps a backup, serializes updates,
and restores a valid backup when the primary file is corrupted. The repository
boundary is replaceable by a durable database adapter later.

Reason: the API needs real persistence, replayable demos, and corruption
recovery now, while the current Site runtime must remain Worker-compatible and
the dashboard should not depend on an external database during local review.

## D-019 — Add dashboard read models before building the dashboard surface

Decision: expose typed SCAN/FIX/SHIP read models and a cursor-paginated activity
timeline from the API instead of making the dashboard reconstruct workflow state
from many low-level collections.

Reason: the launch demo needs one obvious next action, consistent status
language, and stable loading/error contracts. Keeping this projection server-side
also makes the future dashboard thinner, faster, and less likely to disagree
with release policy or audit state.

## D-020 — Keep release readiness and collaboration as server projections

Decision: calculate release-readiness checks and collaboration ownership on the
API boundary, including the manifest, policy, verification, health, audit, PR,
review, and permission signals used by the dashboard.

Reason: these signals have different source collections and failure modes. A
single typed projection gives operators one explainable decision surface and
prevents the UI from silently treating missing evidence as a passing check.

## D-021 — Give operators a handoff brief, not raw collections

Decision: expose a compact operator brief that joins current risk, release
readiness, collaboration ownership, rollback steps, metrics, and evidence links.
The brief is also exportable as CSV for incident handoff.

Reason: the first dashboard action must be obvious within seconds. A brief keeps
the narrative and the underlying evidence together without making users visit
five screens to decide whether to ship or undo.

## D-022 — Keep release comparison explainable at field level

Decision: expose a release delta that compares patch hashes, policy outcomes,
runtime health, rollout controls, audit counts, and verification scores with an
explicit changed/unchanged state.

Reason: a numeric score alone cannot tell an operator why a candidate release is
safer. Field-level differences make before/after review and rollback decisions
auditable in the dashboard and in exported handoffs.

## D-023 — Hash release snapshots for stable handoff links

Decision: expose a content-hashed release snapshot containing the manifest,
patch membership, policy posture, rollout state, health summary, and audit
reference for a release.

Reason: dashboard deep links and offline handoffs need a stable, verifiable
record of what the operator actually reviewed, without making the browser
reconstruct the release from mutable collections.

## D-024 — Stage the new operator workspace at `/dashboard`

Decision: keep the seeded ShopNest incident at `/` while the commercial
operator workspace is introduced at `/dashboard`; the dashboard will become the
default landing surface after its full route and demo contract is complete.

Reason: this keeps the currently reviewable incident fixture reachable during
the rebuild while allowing SCAN/FIX/SHIP navigation to evolve independently of
the storefront fixture and its visual regression evidence.

## D-025 — Keep the dashboard API-first with a deterministic read-only fallback

Decision: the dashboard requests the typed workspace read model from the API when
available and falls back to the same deterministic ShopNest fixture when the API
process is offline. The UI labels the fallback as a demo workspace and never
pretends that a local seed is a live mutation.

Reason: the dashboard and API run as separate local services during the launch
demo. A disconnected API should leave the operator with inspectable evidence,
not a fake spinner or a blank screen, while the visible source label preserves
trust about what can be changed.

## D-026 — Make site context explicit in the operator overview

Decision: the overview keeps the selected ShopNest site, repository, owner,
environment, release policy, finding count, and managed patch count in one
site-overview card, with a direct handoff to release policy.

Reason: the operator needs to confirm scope before editing a live website. The
card makes the currently selected site legible without forcing a separate page
or hiding policy posture inside the project selector.

## D-027 — Show health events beside incident controls

Decision: the incidents route renders the API read model's health events as a
timeline beside the circuit-breaker state and replay scrubber. Empty health
history is explained explicitly rather than replaced with a fabricated chart.

Reason: rollback decisions need both the current signal and the sequence that
led to it. Keeping observed event evidence in the route makes the rollback
recommendation inspectable and preserves the product's plain-English status
contract.

## D-028 — Keep operational support routes inside the same dashboard shell

Decision: collaborators, evidence, install, and settings are first-class
dashboard routes with the same navigation, source banner, theme system, focus
states, and stitched seams as SCAN/FIX/SHIP.

Reason: launch-demo users need to move from a patch decision to its ownership,
proof, setup, or policy without changing products. Keeping these surfaces in
the shell also lets the API-backed read model and deterministic fallback share
one trust boundary.

## D-029 — Do not probe a missing API origin from the browser

Decision: when `NEXT_PUBLIC_API_URL` or `window.__PATCHWORK_API_URL` is absent,
the dashboard enters its explicitly labeled deterministic seed mode without
issuing a same-origin `/api` request. When an API origin is configured, the
typed workspace request remains the source of truth and still falls back safely
if it fails.

Reason: the API is a separate local service in the launch demo. A browser-side
probe to the dashboard origin created avoidable 404 console noise before the
fallback could render, which violated the zero-console-error contract and made
the source banner less trustworthy.

## D-030 — Stage marketing at `/web` during the storefront migration

Decision: add the marketing landing surface at `/web` while `/` remains the
seeded ShopNest incident fixture. The marketing surface links into `/dashboard`
and uses the same measured proof language and seam motif.

Reason: the storefront is still the verifier fixture and is intentionally
valuable as a public incident reproduction. A separate marketing route lets the
launch story mature without hiding or destabilizing the end-to-end bug demo;
the default landing route can switch after the public-surface gate is complete.

## D-006 — Deterministic offline demo data

Decision: seed named actors, releases, findings, timestamps, and ShopNest
catalog data from a deterministic clock and seed. Browser storage is limited to
device preferences and explicitly local demo state.

Reason: screenshots, Playwright runs, judge evidence, and deployments must show
the same coherent incident without network-dependent fake data.

## D-007 — Original procedural assets only

Decision: generate product illustrations, hero art, state art, avatars, icons,
and the AI orb with scripts under `tools/assets`; store manifests and validate
dimensions and external URL absence.

Reason: the brief requires an original commercial visual language and the demo
must run offline without stock-image or licensing uncertainty.

## D-008 — Dashboard-first density, marketing-first breathing room

Decision: use dense 13–14px UI text and tabular numerals in the app, with larger
display type only on marketing hero sections. Both surfaces share the same
seam, color, and motion language.

Reason: operators need scanability while the public story needs a clear visual
hierarchy and confident pacing.

## D-009 — Make responsive QA a first-class local command

Decision: `npm run screenshots` defaults to the vinext server’s `localhost`
binding, captures both live routes in dark and light at desktop, tablet, and
mobile widths, and fails on console or page errors.

Reason: a screenshot can look polished while still hiding hydration failures,
mobile overflow, or an unreachable state. Keeping the runner deterministic and
offline makes visual QA repeatable for every later product group.

## D-010 — Test design contracts without coupling to a browser session

Decision: keep fast source-level contracts for reduced motion, keyboard labels,
announcement semantics, and signature-moment reachability alongside the
Playwright capture runner.

Reason: browser captures prove runtime health, while small deterministic tests
make regressions in the shared primitives obvious during every build without
requiring a long-lived browser process.

## D-031 — Keep public marketing routes static and offline-safe

Decision: the tour, security, customers, and docs pages share one subpage shell,
use only local assets, and expose a local offline/retry state rather than
depending on the API to render public product education.

Reason: visitors should be able to understand PATCHWORK during an API outage,
and one shared shell keeps evidence language, navigation, and responsive
behavior consistent across the marketing surface.

## D-032 — Keep ShopNest as a local, release-switchable fixture

Decision: ShopNest owns deterministic catalog and checkout state in a client
provider, with v1, v2, and v3 selected through the visible release control. The
cart, saved products, and mode are device-local; PATCHWORK remains the authority
for patch evidence and release decisions.

Reason: the storefront needs to be useful as a normal commerce journey while
remaining resettable, offline-safe, and able to demonstrate healthy, breaking,
and ambiguous releases without shipping hardcoded repairs into the product.

## D-033 — Keep ShopNest domain engines on the customer path

Decision: catalog, checkout, shipping, review, recommendation, and release
health logic must be imported by the corresponding visible ShopNest routes, with
pure-function tests covering the edge states. A helper that is only counted by
the LOC script does not qualify as feature depth.

Reason: the commerce fixture is a proof surface for PATCHWORK quality, not a
static screenshot. Keeping the calculations and policy decisions at the domain
boundary makes search, checkout, and release evidence deterministic and easier
to audit without adding a network dependency.

## D-034 — Keep dashboard evidence typed, shared, and honest

Decision: dashboard operator screens consume pure typed engines for query state,
finding and patch filters, workspace metrics, policy gates, rollout decisions,
release narratives, evidence records, quality budgets, and verification checks.
The UI exposes the resulting green/amber/red state directly, while Lighthouse
remains explicitly amber until a measured capture exists. Evidence and browser
verification can be exported as deterministic CSV without credentials.

Reason: SCAN, FIX, and SHIP need one explainable decision model. Keeping the
logic outside dense JSX prevents screens from drifting into contradictory copy,
makes edge states testable, and avoids inventing launch evidence just to make a
score appear green.

## D-035 — Constrain dashboard patch drafts before preview

Decision: the dashboard FIX path treats a patch as a typed draft with one or
more allowlisted operations, a semantic target fingerprint, an explicit inverse
operation, a preview state, a human review decision, and a conflict decision.
The UI rejects unsafe color values before saving and shows the validation
contract beside the operation editor.

Reason: an editor that accepts arbitrary CSS can look useful while undermining
the safety promise. Making the inverse and the conflict decision first-class
keeps isolated preview, review, and rollback aligned with the core SDK policy.

## D-036 — Treat verification as a replayable evidence record

Decision: the dashboard verification surface models each browser check with an
observed value, expected boundary, duration, route, and evidence list. A run has
a deterministic identity, viewport matrix, replay count, comparison summary,
and a green/amber/red release posture. The UI derives its score and state from
that record and can export the check rows as CSV.

Reason: a single green badge is not enough for a launch demo or a real operator.
Keeping the evidence granular makes regressions visible, gives the release
screen a trustworthy input, and makes offline handoff possible without claiming
that an unmeasured check passed.
