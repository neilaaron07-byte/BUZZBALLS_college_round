# PATCHWORK Status

Updated: 2026-10-10

## Current state

- Current group: Group 10 in progress — API workflow is complete; the new operator workspace is being built at `/dashboard`.
- Baseline surface: the existing vinext Site renders a seeded ShopNest checkout incident with a PATCHWORK inspector dock.
- Planning: `AGENTS.md`, `BRAINSTORM.md`, and `PLAN.md` are present. The plan contains 244 dependency-aware tasks, including the design-system track.
- Deployment: the existing private Sites project remains configured in `.openai/hosting.json`; deployment will follow the first validated product milestone.

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
- The first `/dashboard` overview is now runnable: next action, real session stopwatch, SCAN/FIX/SHIP cards, risk ring, release pipeline, recent activity, review ownership, command palette, theme toggle, and mobile navigation are wired.
- P139–P143 are complete: reusable primitives and explicit status explanations are exercised in the operator shell; the summary keeps the next best action visible and starts a real 60-second session stopwatch.
- P145 and P148 are complete: SCAN now exposes a detector summary, completed re-scan action, finding filters, severity, confidence, measured snapshot values, resolver signals, DOM target evidence, and blast-radius explanation.
- FIX is partially active: Patches has realistic queue data, filters, reviewer/approval state, one-operation diff, conflict warning, private-preview state, and explicit handoff to release control. P146, P147, and P149 remain open until the list/kanban, composer, and API-backed preview contract are complete.

## Next

1. Finish FIX with kanban/sort/saved views, operation composer, and API-backed isolated preview (P146–P149).
2. Add review, conflict, verification, release, incident, audit, collaborator, and settings screens (P150–P162).
3. Connect verifier and PatchPilot contracts to the dashboard’s API client and durable release controls.
4. Keep `npm run loc` visible as feature packages grow toward the measured gates.

## Known issues

- The repository is still a single vinext app; the target workspace packages do not exist yet.
- The current ShopNest incident surface still contains the first-pass visual language and will be migrated incrementally.
- The final LOC gates are intentionally not met yet: current measured handwritten LOC is 9,397 overall; `apps/api` is 4,000/4,000, while dashboard, marketing, ShopNest, core, SDK, extension, verifier, AI, and tests remain below their final thresholds.
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
