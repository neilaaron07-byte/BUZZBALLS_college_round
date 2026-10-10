# PATCHWORK Brainstorm

## Product thesis

PATCHWORK is the safety layer between a broken frontend and a redeploy. It is
not a generic page builder, a CSS override bookmarklet, or a feature-flag
dashboard. It lets a team inspect the live surface, describe a small reversible
change, verify the change against real browser behavior, and ship it with a
signed release that can be undone in one click.

The product should feel like a calm incident room: the user always knows what
PATCHWORK found, why it believes that finding is real, what the proposed fix
will touch, and what will happen when they press the next button.

North Star: **Fix any website in 60 seconds. Ship with confidence. Undo in one
click.**

Primary loop:

```text
SCAN  ->  explain the break and find the target
FIX   ->  draft, preview, review, and verify the patch
SHIP  ->  release, observe, and rollback when needed
```

## Personas and top pains

### 1. Frontend developer

- A one-line production fix is trapped behind a 40-minute build and deploy.
- The original DOM changes before their patch ships, so selectors go stale.
- A CSS or copy fix is difficult to review as a meaningful code change.

### 2. Agency owner

- Client sites run on vendor stacks the agency cannot safely redeploy.
- Small fixes compete with billable roadmap work and become support debt.
- Multiple client stakeholders need an audit-friendly explanation of what changed.

### 3. Accessibility lead

- Contrast, focus, label, and keyboard regressions surface after release.
- Engineering teams need a reproducible proof of the accessibility fix.
- A visual hotfix can solve one issue while silently creating another.

### 4. QA engineer

- Regression verification is slow when a patch only touches one DOM target.
- Screenshots alone do not prove that checkout, search, or login still work.
- There is no trustworthy path from a discovered issue to a quarantined release.

### 5. Product manager

- Customer-impacting defects wait behind release trains and ownership queues.
- A proposed workaround is hard to evaluate without seeing blast radius.
- Status updates lack a clear answer to “is it safe to ship yet?”.

### 6. SRE on call

- A broken frontend can require coordination across a team that is asleep.
- Feature flags do not solve copy, layout, or third-party markup regressions.
- Rollback is often a broad deploy rollback rather than a precise patch rewind.

### 7. Junior developer

- Fragile selectors and positional CSS are hard to recognize before release.
- A conflict or resolver score is opaque without plain-English guidance.
- Fear of touching production encourages large, risky changes later.

### 8. Non-technical store owner

- They can see a broken checkout but cannot edit the source application.
- Technical language makes the difference between preview and production unclear.
- They need a short path from “customers are blocked” to “the issue is fixed”.

## 30 concrete problems PATCHWORK solves

1. Checkout Buy button is hidden after a layout wrapper ships.
2. Sale price falls below WCAG AA contrast on a dark theme release.
3. A legal page uses the wrong refund policy sentence.
4. Vendor-owned storefront cannot be redeployed by the team that owns the fix.
5. An A/B test leaves a duplicate Add to cart action in the DOM.
6. Mobile layout breaks only at the 390px viewport.
7. A React remount removes a patch after navigation.
8. A hashed CSS class changes between builds and breaks a brittle selector.
9. A product card title moves from a `section` into a new `div` wrapper.
10. An old patch silently edits the wrong instance after a duplicate is introduced.
11. A checkout button loses its accessible name after a copy refactor.
12. A shipping estimate has a stale “tomorrow” promise during a holiday.
13. A third-party widget renders after initial page load.
14. A release changes a DOM path but preserves the same semantic landmark.
15. A marketing banner links to a `javascript:` URL after content import.
16. A team needs a temporary fix without granting repository write access.
17. A hotfix must be reviewed by a second developer before production.
18. A patch changes a shared element that appears on home, search, and PDP.
19. A visual change passes desktop but clips on tablet.
20. A patch fixes a button but breaks the keyboard checkout path.
21. An accessibility audit finds a regression with no baseline comparison.
22. A production release needs a 10% canary before broad rollout.
23. A patch causes console errors only for a small visitor cohort.
24. A bad release needs a one-click rollback to the last healthy manifest.
25. A rollback must be explainable after the incident is over.
26. A release must be blocked while an unresolved conflict is open.
27. A target is missing and the system needs to skip it instead of guessing.
28. A moved target needs an auto-heal proposal, not a silent mutation.
29. An agency needs a shareable preview link that never touches production.
30. A judge, auditor, or customer needs proof of what happened and when.

## Competitor teardown

| Product | Best UX lesson | What PATCHWORK steals or beats |
| --- | --- | --- |
| Vercel | Fast deploy feedback, clean project-level navigation, confident build status | Keep the composure and speed of deploy UX, but make the action a precise patch instead of a full application redeploy. |
| Linear | Dense information design, keyboard-first navigation, opinionated status language | Borrow command palette, terse states, and keyboard flow; beat it with live website context and browser evidence. |
| Sentry | Excellent issue grouping, regression context, and incident timelines | Use explainable evidence, health signals, and incident replay; focus the narrative on one repairable surface. |
| LaunchDarkly | Clear rollout controls, targeting, kill switch, and environment separation | Reuse canary, promote, pause, and kill-switch patterns for signed patch manifests, including DOM safety. |
| Chromatic | Story-level visual review and component regression confidence | Bring visual diff into the real website and pair it with interactions, accessibility, and resolver confidence. |
| Percy | Simple before/after visual comparison and baseline workflow | Keep the low-friction slider and changed-region framing, but add semantic target tracking and safe deployment. |
| Optimizely | Non-engineer-friendly visual editing and experiment governance | Borrow visual selection and audience clarity; beat it with patch versioning, resolver safety, and rollback. |
| Hotjar | Fast visual understanding of what real users experience | Keep the human-readable visual story; connect it to a safe fix rather than stopping at observation. |

### Positioning gap

Competitors typically own one slice: deploy, observe, experiment, or visually
verify. PATCHWORK connects the loop. Its moat is the combination of semantic
target resolution, safe patch operations, browser verification, and a signed
release journal that makes the repair explainable.

## 25 delight moments

1. The stitched PATCHWORK mark draws its seam on first launch.
2. The scan finishes with a calm “3 things need attention” summary, not a wall of logs.
3. A highlighted element shows the exact semantic reason it was selected.
4. Resolver confidence fills like a health ring and names the top signal.
5. A one-sentence AI explanation turns a conflict into a human decision.
6. The before/after slider snaps to the repair boundary and feels physical.
7. A patch card folds its stitched corner when moved between statuses.
8. Preview mode labels exactly what is private and what remains public.
9. A failed accessibility check points to the affected text, not just a score.
10. The release checklist turns green one gate at a time.
11. Shipping produces restrained confetti made of tiny seam dashes.
12. The undo toast stays visible long enough to make rollback feel safe.
13. The time-to-fix stopwatch starts at “broken” and stops at “verified”.
14. A canary slider shows the cohort count in plain visitor language.
15. A moved target animates from old location to new location in the DOM snapshot.
16. An ambiguous target refuses to guess and explains how to disambiguate it.
17. A release timeline scrubs through the incident without leaving the page.
18. The audit chain badge changes from “checking” to “intact” with a clear reason.
19. The command palette previews the destination and its keyboard shortcut.
20. A non-technical owner can copy a preview link and understand its expiry.
21. Health scores use the same green/amber/red language everywhere.
22. The “bad patch caught” demo is visible and satisfying, not hidden in a test.
23. A policy gate explains the exact missing approval instead of disabling a button.
24. A signed manifest card exposes the hash without overwhelming the user.
25. A post-release health event automatically opens the exact patch that caused it.

## Information architecture

### Public marketing surface (`apps/web`)

- `/`: hero, SCAN/FIX/SHIP story, 60-second stopwatch, before/after demo,
  proof metrics, CTA to dashboard, install snippet.
- `/product`: interactive tour of scan, patch, verify, release, rollback.
- `/security`: signed manifests, allowlists, threat model, fail-safe behavior.
- `/customers`: realistic use cases for agencies, storefronts, portals, and legacy apps.
- `/docs`: concise first-run guide with no dead links.
- Shared states: normal, reduced motion, keyboard focus, signed-out CTA.
- Empty states: no case study selected, no search result, no docs filter match.
- Error states: demo unavailable, route not found, copy failure.

### Dashboard shell (`apps/dashboard`)

- `/dashboard`: Today summary with next best action, active site, scan health,
  time-to-fix, active release, open conflicts, recent activity.
- `/dashboard/sites`: managed sites list with health, release, open findings,
  last scan, owner, and “Scan site” action.
- `/dashboard/sites/:siteId`: site overview, pages, policy gates, SDK status,
  environments, recent incidents.
- `/dashboard/scan/:scanId`: scan progress, findings, grouped by severity,
  target confidence, blast radius, viewport coverage.
- `/dashboard/patches`: list and kanban views; filters for status, owner,
  severity, site, release, and health.
- `/dashboard/patches/new`: patch composer with visual target, operations,
  plain-English explanation, policy preview, save draft.
- `/dashboard/patches/:patchId`: detail with before/after, resolver signals,
  operations, review thread, verification, conflicts, health history.
- `/dashboard/previews/:previewId`: isolated preview with public-vs-patched
  split, expiry, target overlay, and share controls.
- `/dashboard/reviews`: review inbox grouped by requested action and risk.
- `/dashboard/conflicts`: conflict queue with side-by-side operations and
  suggested resolution.
- `/dashboard/verification/:runId`: run timeline, interaction checks, visual
  diff, accessibility delta, console/network checks, screenshots.
- `/dashboard/releases`: version timeline, policy checklist, canary control,
  promote, pause, kill switch, rollback.
- `/dashboard/incidents`: live and historical incidents, health events,
  circuit-breaker state, replay entry point.
- `/dashboard/audit`: hash-chained journal with filters, export, tamper test,
  actor and release context.
- `/dashboard/collaborators`: people, roles, approvals, PRs, activity.
- `/dashboard/evidence`: resolver benchmark, SDK budget, verification catches,
  quality gates, Lighthouse summary, time-to-fix.
- `/dashboard/install`: SDK snippet, extension install, environment checklist.
- `/dashboard/settings`: site policy, allowlist, notification preferences,
  integration status, danger-zone controls.

### Chrome extension (`packages/extension`)

- Inspector overlay: hover, click, breadcrumb, parent/child navigation.
- Target evidence drawer: fingerprint, signals, fragility warnings, confidence.
- Visual editor: text, color, typography, spacing, visibility, attributes,
  reorder, undo/redo.
- Draft handoff: save to API, preview in isolation, open dashboard detail.
- Empty states: no page connected, no target selected, no editable operation.
- Error states: cross-origin blocked, target disappeared, API offline, unsafe value.

### ShopNest demo (`apps/shopnest`)

- `/`: home with navigation, search, product cards, release marker.
- `/search`: query, filters, results, empty query, no-results state.
- `/product/:slug`: product information, price, reviews, Buy action, shipping.
- `/cart`: cart summary, quantity, empty cart, checkout CTA.
- `/checkout`: address, payment, review, success, failure, retry.
- `/login`: sign in, error, locked state, demo credentials hint.
- Release modes: v1 healthy, v2 breaking, v3 refactor.

### API and operations (`apps/api`)

- Health: `/healthz`, `/readyz`, `/metrics`.
- Sites, scans, findings, patches, revisions, reviews, conflicts, previews,
  verification runs, releases, rollbacks, audit, health events, GitHub PRs,
  telemetry, demo reset.
- Explicit request IDs, structured errors, rate-limit response, idempotency.

## Signature visual motif

### The seam

PATCHWORK’s signature is a stitched dashed seam: a calm, slightly irregular
line that connects a found issue to its target, the target to its patch, and the
patch to its release. It is used as:

- a short dashed divider in cards;
- a corner stitch on patch cards;
- the connector between scan findings and fix actions;
- the progress line in release and incident timelines;
- a faint background grid on the marketing hero;
- a visible focus ring variant for interactive seam elements.

The seam must never be decorative noise. It always communicates relationship,
progress, or reversibility. The visual system uses ink/navy, paper/white,
lime/green for safe, amber for attention, and coral/red for blocked risk. Icons
are code-native line icons or an existing icon component; emoji are forbidden.

## Product language

- “Scan site” instead of “Run analysis”.
- “Fix safely” instead of “Apply mutation”.
- “Preview privately” instead of “Create sandbox”.
- “Ready to ship” instead of “Passes all checks”.
- “This patch was skipped because PATCHWORK could not identify one safe target”
  instead of “resolver ambiguity”.
- “Undo release” instead of “rollback deployment”.

## Open questions resolved by default

- Use a deterministic local demo provider first; make live GitHub an explicit
  integration mode, never a requirement for the offline demo.
- Treat precision as more important than recall: a missing or ambiguous target
  is skipped and surfaced rather than guessed.
- Keep the first-run dashboard focused on one site and one next action; expose
  deeper evidence through secondary navigation.
- Make the dashboard and marketing site share tokens but not a giant component
  file. Their jobs are different even when the brand is shared.
