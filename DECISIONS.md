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
