# PATCHWORK Status

Updated: 2026-10-11

## Current state

- Current group: Group 14 visual/performance tranche complete — `/dashboard`, `/web`, `/fix`, and ShopNest are runnable locally; the expanded screenshot matrix, measured Evidence baselines, and recorded demo handoff are complete.
- Baseline surface: the existing vinext Site renders a seeded ShopNest checkout incident with a PATCHWORK inspector dock.
- Planning: `AGENTS.md`, `BRAINSTORM.md`, and `PLAN.md` are present. The plan contains 244 dependency-aware tasks, including the design-system track.
- Deployment: the existing private Sites project remains configured in `.openai/hosting.json`; deployment will follow the first validated product milestone.

## Group 14 handoff

### Done

- Captured and reviewed 180 route/theme/viewport screenshots twice. The first pass exposed missing local CORS headers; the repaired second pass completed 180/180 with zero browser console errors.
- Wrote `docs/DESIGN_REVIEW.md` with 40 specific findings and applied the responsive density, mobile action, PatchPilot drawer, settings, evidence, and ShopNest empty-state repairs.
- Added `npm run performance`, which measured 4.08 ms API read p95 across 32 seeded reads and 18.78 ms rollback request-to-restore time. Evidence also reports 7.2 KB SDK gzip, zero capture console errors, and a 0.02 reserved-layout CLS baseline.
- Added `npm run ai:eval`, `npm run demo:video`, `docs/demo.webm` (98.68 seconds), and `docs/hero.gif` derived from the real Playwright flow. The recorded flow completed with zero browser errors.
- Refreshed README, API, demo choreography, and the architecture/threat/contribution handoff files. Lighthouse is now provisioned and measured: landing 57/100/100 and dashboard 49/96/100 for performance/accessibility/best practices.
- The dedicated `npm run playwright`, contrast, SDK-size, extension-smoke, and verifier-evidence gates are green; the full browser flow reports zero console errors.
- Measured handoff: 116 tests pass, SDK gzip is 7,212 bytes, API read p95 is 4.08 ms, rollback is 18.78 ms end to end, the capture baseline is 0.02 CLS, and the recorded demo is 98.68 seconds.

### In progress

- Improving production-surface performance to close the Lighthouse performance target; the current Vinext production start command exits before binding, so the captured baseline uses the runnable local supervisor.
- Closing the measured LOC gates with additional real package features and tests; the current source is intentionally below the final 25,000+ threshold.

### Next

- Run `npm run ai:eval`, the full test suite, `npm run judge`, and a clean-room demo after the final visual tranche.
- Use the new `npm run lighthouse` runner after production-server startup is reliable, then close the performance gap with route-level code splitting and asset budgets.
- Continue package-depth work before any private Sites deployment claim.

### Known issues

- The current local implementation is a polished launch demo, not a production multi-tenant deployment. Live mutation requires the target site’s SDK handshake, signed manifest, verification, and human approval.
- Lighthouse performance remains below target: landing 57, dashboard 49. Accessibility and best practices pass at 100/100 and 96/100/100 respectively.
- `npm run loc` remains below the requested package minima; no dead code or duplicated padding was added to disguise that gap.

## Done in this phase

- Established the operating contract and measured size gates.
- Captured personas, real-world incidents, competitor lessons, delight moments, information architecture, and the stitched-seam motif.
- Added the design-system contract for dark/light themes, Geist, motion, procedural assets, component primitives, `/design`, accessibility, and screenshot QA.
- Added architecture, threat-model, contribution, demo, decision, and feature-proof documentation.
- Group 0 validation: `npm run build`, `npm test`, `npm run lint`, `npx tsc --noEmit`, and `git diff --check` pass when run serially. The initial parallel check exposed a build-artifact race in the existing wrapper; the serial test is green.
- Group 1 validation: workspace package graph, strict typecheck, lint, build, rendered HTML smoke tests, demo reset, judge, and LOC report pass. Current measured LOC is intentionally below final gates because feature packages are not implemented yet.

## In progress

- Converting the single-surface starter into a workspace that can host the dashboard, marketing site, ShopNest demo, API, and safety packages.
- Building the shared visual foundation before feature screens so every surface uses one product language.
- Installing the design-system foundation and adding the first shared visual primitives under `apps/dashboard/src/ui`.
- D001–D010 are complete: Geist, token variables, Tailwind mapping, theme persistence, AA contrast assertions, seam primitives, stitched logo, layered backgrounds, and Motion constants are implemented and exported from the shared dashboard UI boundary.
- D011–D020 are complete: the exported UI boundary now includes accessible controls, Radix-backed overlays, command search, status/loading/error states, dense data/evidence primitives, and responsive layout helpers. `/design` exercises the live states.
- D021–D027 are complete: signature motion components are exported and demonstrated in the `/design` gallery, including repair morph, before/after, spotlight, story rail, rollback time machine, AI stream, DOM evidence, audit tamper state, and integration marquee.
- D028–D034 are complete: the deterministic asset generator created 48 original local assets, including 24 ShopNest product illustrations, hero SVG/PNG, state art, social previews, icons, avatars, and PatchPilot orb; manifest validation passes with no external URLs.
- D035–D038 are complete: six design-system contract tests pass; the Playwright runner captured all 12 route/theme/viewport combinations with zero console errors; representative baselines were reviewed; typecheck, tests, build, lint, contrast, asset validation, judge, and screenshot gates pass.
- P023–P034 are complete: `@patchwork/core` now exports Zod-backed site, release, manifest, patch, operation, review, verification, health, and audit schemas; canonical normalization and Web Crypto SHA-256 hashing; same-origin and CSS safety checks; plain-English safety errors; and a 40-fixture malicious payload suite. `npm run core:gate` reports no `any` types.
- P035–P049 are complete: semantic fingerprints normalize copy, classes, stable attributes, DOM paths, siblings, landmarks, viewport regions, and visual roles; the weighted resolver reports exact, moved, ambiguous, and missing outcomes with thresholds, runner-up evidence, and plain-English reasons; 32 mutations and a deterministic 200-scenario benchmark pass. The explainable fixture is in `docs/evidence/resolver-confidence.md`.
- P050–P065 are complete: three-way conflict keys and semantic conflict detection, stale-manifest and dependency-cycle blocking, Ed25519 signing and replay guards, hash-chained audit verification, and six pure scanner detectors now pass their conflict, tamper, signature, and finding tests.
- P066–P079 are complete: the dependency-free `@patchwork/sdk` verifies and caches signed manifests, resolves target evidence against the live DOM, applies transactional safe mutations with inverse rollback, re-applies after remounts, batches health events with backoff, and pauses after repeated failures. Four jsdom tests pass, and `npm run sdk:size` measures 7,212 gzipped bytes against the 15,360-byte budget.
- P080–P093 are complete: the MV3 extension now packages a content inspector, service-worker handshake, side panel, DOM breadcrumbs, fingerprint warnings, resolver signal bars, visual controls, safe attributes, constrained reorder, local undo/redo, and explicit state cards. Four jsdom interaction tests and the `extension:smoke` package check pass.
- P094–P105 are complete: `@patchwork/verifier` loads published and patched URLs in isolated Chromium contexts, checks semantic target recovery, runs purchase/search/login/checkout probes, captures Axe and console/network evidence, records visual diffs with changed-region bounds, calculates a release score, and replays stored reports offline. The seeded hidden Add to cart regression is blocked in `docs/evidence/verifier/hidden-buy-button/report.json` with committed screenshot evidence.
- P106–P116 are complete: `@patchwork/ai` now exposes typed scan/explain/suggest/summarize/draft tools, evidence-constrained prompts for findings/conflicts/release risk/rollback, a deterministic offline PatchPilot engine, moved-target auto-heal proposals that stay review-only, blast-radius and health narratives, cancellable answer streaming, and an optional provider adapter with offline fallback. The deterministic fixture is in `docs/evidence/ai/offline-fixture.json`.
- P117–P135 are complete: `apps/api` now provides an Express-compatible local server, atomic JSON persistence with corruption recovery, deterministic ShopNest seed state, request IDs/logs/rate limits/idempotency, scan lifecycle and findings, content-hashed patch revisions, reviews/collaborators/approval policy, conflicts and merge previews, expiring previews, verifier report replay, release/canary/pause/kill-switch/rollback controls, automatic health-triggered rollback, audit export/verification/tamper testing, MockGitHub plus optional Octokit boundaries, analytics, workspace export/import, diagnostics, and 38 full workspace tests.

## API gate closure complete

- P136a–P136l are complete: the API now exposes typed SCAN/FIX/SHIP workspace cards, cursor timelines, release-readiness checks, collaboration ownership, operator handoffs, release deltas, content-hashed snapshots, CSV exports, and safe contract coverage.
- Group 10 is active: `/dashboard` is the operator control plane; `/` remains the deterministic ShopNest incident fixture during migration.
- P137–P138 are complete: the dashboard is split into route-level modules with a responsive shell, shared seam/tokens styling, API/seed data contracts, and no file over the 1,000-line limit.
- The first `/dashboard` overview is now runnable: next action, real session stopwatch, SCAN/FIX/SHIP cards, risk ring, release pipeline, site policy context, recent activity, review ownership, command palette, theme toggle, and mobile navigation are wired.
- P139–P143 are complete: reusable primitives and explicit status explanations are exercised in the operator shell; the summary keeps the next best action visible and starts a real 60-second session stopwatch.
- P145 and P148 are complete: SCAN now exposes a detector summary, completed re-scan action, finding filters, severity, confidence, measured snapshot values, resolver signals, DOM target evidence, and blast-radius explanation.
- FIX is active: Patches has list and kanban modes, realistic queue data, filters, sorting, a saved view, reviewer/approval state, an operation editor, one-operation diff, conflict warning, API-backed private-preview state, and explicit handoff to release control. P144, P146, P147, and P149 are complete.
- P150–P151 are complete: review inbox and conflicts make approvals, required checks, people, side-by-side operations, PatchPilot guidance, keep/archive decisions, and audit-ready resolution state visible.
- P152–P155 are complete: verification exposes interaction, visual, accessibility, and console evidence; incidents expose observed health events, circuit-breaker posture, rollback, and replay; SHIP includes policy checks, signed manifest evidence, bounded canary controls, pause/promote/kill-switch/rollback interactions, release comparison, chain integrity, tamper testing, filters, and exportable audit evidence.
- P156–P159 are complete: collaborators expose named ownership and PR checks; evidence reports measured resolver, SDK, regression, test, Lighthouse, and performance proof; install provides SDK/extension steps and an environment checklist; settings provide scoped policy, allowlist, notification switches, and a reviewed local reset.
- P160–P162 are complete: dashboard loading/error/retry, empty, success, toast, and local optimistic states are represented through the shared state primitives and route controls; all screens were captured in dark/light at desktop/tablet/mobile; source contracts cover route wiring, accessible toggles, recoverable loading/error states, and zero-console-error screenshot failures.
- P164–P168 are complete: `/web` has a dark-first marketing shell with stitched PATCHWORK branding, the “Fix any website in 60 seconds” hero, an interactive SCAN/FIX/SHIP state machine, a real session stopwatch, draggable before/after repair evidence, and proof metrics sourced from the measured local resolver, SDK, test, and rollback contracts.
- P169–P174 are complete: `/web/tour`, `/web/security`, `/web/customers`, and `/web/docs` share an offline-safe public shell with tour evidence, signed-manifest boundaries, realistic team stories, first-run documentation, keyboard/mobile/reduced-motion states, metadata, local social preview, contract tests, and a documented Lighthouse budget. The 20-route dark/light desktop/tablet/mobile sweep captured 120 pages with zero console errors.
- P176–P187 are complete: ShopNest now has a coherent catalog, search/filtering, product detail, saved items, cart, checkout, login lockout, local release switching, seeded v1/v2/v3 findings, and the PATCHWORK inspector handoff. The expanded 25-route dark/light desktop/tablet/mobile sweep captured 150 pages with zero console errors.
- ShopNest depth pass is validated: catalog query engines now drive search summaries and empty-state copy; shipping regions and delivery options drive checkout; deterministic order IDs, validation, and totals drive the review/success path; product pages expose review evidence and recommendations; release pages expose policy gates and preview decisions. The 28-route dark/light desktop/tablet/mobile sweep captured 168 pages with zero console errors.
- Dashboard evidence tranche is validated: typed query, finding, patch, activity, workspace-metric, policy, rollout, and release engines now drive SCAN/FIX/SHIP panels; the evidence engine exposes measured records, quality budgets, verification checks, and export-safe CSV; Overview, Scan, Patches, Releases, Audit, and Evidence visibly consume the same plain-English status logic.
- Group 13 validation is green: `npm run typecheck`, `npm run lint`, `npm run build`, `npm test`, focused dashboard engine tests, and the full 28-route dark/light desktop/tablet/mobile sweep passed. The sweep captured 168 pages with zero console errors; representative Overview, Releases, and Evidence captures were reviewed across desktop, tablet, and mobile.
- Launch brief validation is green: the marketing surface is split into typed evidence, chrome, hero, interaction, and section modules; `npm run typecheck`, `npm run lint`, `npm run build`, `npm test` (108 tests), `node --test tests/marketing.contract.test.mjs`, and the full 168-page dark/light desktop/tablet/mobile screenshot sweep pass. The measured total is 13,527 handwritten lines, with `apps/web` at 460 lines; the final marketing size gate remains open rather than being padded.
- Live-site scan tranche is green: typed target policy, SSRF-safe URL/DNS validation, bounded redirects and body reads, inert JSDOM extraction, detector-backed findings, asynchronous job state, versioned `/api/v1/live-sites/scan`, and replayable SSE progress are implemented. The focused live-site suite and full repository suite pass at 116 tests.
- PatchPilot safety tranche is green: the AI package now exposes all 15 requested read/propose tools, redacts secrets and hostile page instructions before provider context, creates inverse-aware review-only action cards, and keeps publish/rollback/delete outside the tool catalog. The focused AI suite and full repository suite pass at 114 tests.
- Group 11B runtime tranche is green: typed live patch proposals persist through the core allowlist, inverses are checked against the same target, SDK installation status and manifest handshakes are explicit, ship actions require a connected runtime plus `humanApproval: confirmed`, idempotency is preserved, and the `/api/v1/ai/stream` route emits deterministic offline SSE tokens. The runtime boundary suite passes and the full repository suite is green at 116 tests.
- PatchPilot dashboard tranche is green: the global Ctrl/Cmd+J drawer provides contextual explain/fix/ship-risk actions, emits review-only action cards, redacts hostile evidence, and routes to the existing review workspace. `/fix` provides a one-screen SCAN → FIX → SHIP flow with a real timer, verification state, canary staging, undo, public-URL recovery, and explicit SDK/runtime copy. Browser smoke confirmed the scan, verify, canary, undo, drawer, and zero-console-error paths.
- Local demo orchestration is green: `npm run demo` supervises the API on port 8787 and the unified vinext surface on port 3000, with the verifier embedded in the API package and ShopNest/dashboard/marketing routes available through the same deterministic server. `npm run demo:reset` resets the API seed state when online and falls back to the browser fixture marker when offline. The final smoke returned 200 for `/dashboard`, `/fix`, and `/web`, plus `healthz` green.
- P163a is complete: the Scan screen now consumes a six-detector scan-session engine with measured finding triage, repeat-run comparisons, explicit clear/finding/blocked states, and export-safe detector CSV. Seven focused scan-session tests cover repeat runs, resolved/new findings, filtering, dangerous targets, and CSV evidence.
- P163b is complete: Patches now consumes a typed draft contract with allowlisted operations, inverse rollback values, preview/review/conflict states, audit timeline events, safety checks, and an unsafe-value guard. Seven focused patch-workflow tests cover blocked, review, approved, changes-requested, archived, and export states.
- P163c is complete: Verification now consumes a typed replay model with interaction, visual, accessibility, console, and network checks; deterministic run IDs; warning/failure states; viewport matrix summaries; run comparison; selected-check narratives; and CSV proof export. Seven focused verification tests cover pass, warning, failure, replay recovery, regression, gate counts, and export evidence.
- P163d is complete: Releases now consume typed health signals, policy gates, canary readiness, conservative transitions, rollback/restore decisions, and a measured health boundary; Audit now derives its hash-linked records, tamper state, narrative, and CSV from the same domain layer. Seven focused SHIP tests cover healthy/degraded/critical signals, blocked gates, pause/promote/rollback/kill-switch transitions, and audit export.
- P163e is complete: Overview now includes a typed SCAN → FIX → SHIP decision graph, local/API recovery state, recent audit handoff, and reusable empty/error/progress/gate panels with actionable navigation. Two focused route-contract tests keep the panel exports and Overview placement reachable.
- P163f is complete: five route-contract checks now keep SCAN export evidence, FIX safety validation, verification replay proof, SHIP health/audit models, and Overview recovery placement wired to visible routes. The full repository suite is green at 108 tests; `npm run typecheck`, `npm run lint`, `npm run build`, and `npm run loc` also pass.

## Next

1. Close the remaining measured LOC gates with real package features and tests; current `npm run loc` evidence remains intentionally below the final thresholds.
2. Improve production-server startup and route-level performance until both Lighthouse performance scores clear 90.
3. Complete the clean-room final gate and only then evaluate private Sites deployment.

## Known issues

- The repository is still a single vinext app; the target workspace packages do not exist yet.
- The current ShopNest incident surface still contains the first-pass visual language and will be migrated incrementally.
- The final LOC gates are intentionally not met yet: current measured handwritten LOC is 14,519 overall; `apps/api` is 4,434/4,000, while dashboard (2,769/9,000), marketing (460/2,500), ShopNest (1,178/2,500), tests (2,369/4,000), core, SDK, extension, verifier, and AI remain below their final thresholds.
- The currently deployed Site reflects the prior validated incident demo, not this rebuild in progress.
- `npm install` reports 28 transitive audit findings in the existing toolchain; no production feature dependency was added yet.
- The core safety gate is intentionally narrower than the final release gate: signing, resolver, conflict, scanner, API, and dashboard behavior remain in later groups.
- The scanner currently consumes a normalized page snapshot; the verifier now collects browser evidence, while a richer production scanner feed remains an API/dashboard task.
- SDK runtime guards intentionally stay lightweight for the browser bundle; the authoritative Zod schema boundary remains in `packages/core` for authoring and server surfaces.
- The extension side panel currently hands off draft intent through the protocol boundary; dashboard persistence and private preview URLs land in the API/verifier groups.
- PatchPilot defaults to the deterministic offline provider; remote model credentials and server-side adapters are intentionally deferred to the API boundary.
- Group 9 is complete. The API gate is green at exactly 4,000 handwritten lines, but the final 25,000+ LOC and product-surface gates remain open by design.
- The visual primitives are wired into the root layout and global CSS, but the existing ShopNest screen is still being migrated to use them.
- Browser QA found and fixed a persisted-theme hydration mismatch; a fresh `/design` session now reports no console errors after theme restoration.
- The screenshot sweep requires the host environment to allow Playwright Chromium; the sandboxed invocation is blocked by macOS Mach-port permissions, while the approved run passes the 168-page sweep.
- Live-site scanning is intentionally an inert HTML stage; it does not execute third-party scripts or claim browser layout/runtime proof until the verifier and connected SDK stages run.
- Live-site mutation is intentionally not an arbitrary server-side HTML rewrite: a target origin must install the PATCHWORK SDK, complete a manifest handshake, pass verification/policy, and receive a human-confirmed ship action. The local `/fix` sample uses a deterministic ShopNest fixture when no API base is configured.
