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
