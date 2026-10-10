# PATCHWORK Rebuild Plan

This is the executable task graph for the commercial-grade rebuild. Tasks are
ordered; each task is intentionally small enough for one sitting. `depends`
lists task IDs that must be complete first. A group is considered complete only
when its group gate passes and the application is still runnable and demoable.

The rebuild is organized as a real monorepo while preserving the current Sites
starter's Cloudflare-compatible build shape. Every group ends with typecheck,
tests, build, lint, and a deterministic demo smoke check. Each completed task
gets ticked here, committed with a conventional commit, and reflected in
`STATUS.md`.

## Group 0 — governance and working memory

- [x] P001 Create `AGENTS.md` with the operating contract, banned list, size gates, and definition of done. (depends: none)
- [x] P002 Create `BRAINSTORM.md` with personas, problems, competitor lessons, delights, IA, and seam motif. (depends: P001)
- [x] P003 Create this `PLAN.md` with at least 120 dependency-aware checkbox tasks. (depends: P001, P002)
- [x] P004 Create `STATUS.md` with baseline, current group, next group, and known issues. (depends: P003)
- [x] P005 Create `DECISIONS.md` with initial architecture, offline-demo, and precision-over-recall decisions. (depends: P003)
- [x] P006 Add `CONTRIBUTING.md` with local setup, quality gates, commit style, and demo expectations. (depends: P003)
- [x] P007 Add `THREAT_MODEL.md` covering patch injection, manifest replay, collaborator compromise, SDK DoS, SSRF, and CSS exfiltration. (depends: P003)
- [x] P008 Add `ARCHITECTURE.md` with draft, review, verify, release, rollback, and telemetry flows. (depends: P003)
- [x] P009 Add `DEMO.md` with a timed three-minute script, 60-second script, and ten judge answers. (depends: P003)
- [x] P010 Add the final feature-to-proof matrix and known-limitations template to `README.md`. (depends: P003)

**Runnable after Group 0:** Existing dashboard still runs; documentation lint and
file-existence checks pass.

## Group 1 — workspace and contracts

- [x] P011 Convert the root package into npm workspaces for `packages/*` and `apps/*`. (depends: P004, P005)
- [x] P012 Create strict shared TypeScript configuration for packages and apps. (depends: P011)
- [x] P013 Create workspace-level scripts for `typecheck`, `test`, `build`, `lint`, `demo`, `demo:reset`, `loc`, and `judge`. (depends: P011)
- [x] P014 Create package naming and export conventions for core, sdk, extension, verifier, ai, api, dashboard, web, and shopnest. (depends: P012)
- [x] P015 Create shared environment variable validation and `.env.example` without secrets. (depends: P012)
- [x] P016 Add deterministic clock, random seed, and fixture helpers shared by tests. (depends: P012)
- [x] P017 Add structured logger contract with request ID, actor, site ID, and severity. (depends: P012)
- [x] P018 Add common result, error, status, pagination, and cursor types. (depends: P012)
- [x] P019 Add accessibility and focus testing helpers for React surfaces. (depends: P012)
- [x] P020 Add test fixture naming, snapshot policy, and console-error failure policy. (depends: P013)
- [x] P021 Add Node LOC counter that excludes generated files, assets, SVG, lockfiles, and `node_modules`. (depends: P013)
- [x] P022 Run the workspace gate: typecheck, unit smoke test, build, lint, and `npm run loc` report. (depends: P014, P015, P016, P017, P018, P019, P020, P021)

**Runnable after Group 1:** Workspace boots the existing surface and prints
deterministic size metrics through `npm run loc`.

## Group 1A — design language, motion, components, and assets

This group is a prerequisite for the dashboard, marketing, extension, and
ShopNest UI groups. It is intentionally placed before core feature work so the
product does not accumulate a second visual language.

- [x] D001 Add the `geist` package and wire Geist/Geist Mono fallback stacks. (depends: P022)
- [x] D002 Define source token map for color, spacing, type, radius, shadow, blur, z-index, motion, and seam geometry. (depends: D001)
- [x] D003 Emit CSS variables for dark-first surfaces, hairlines, semantic status colors, and gradient accents. (depends: D002)
- [x] D004 Map the token variables into the Tailwind theme without duplicating values. (depends: D003)
- [x] D005 Add light and dark theme provider with system preference, explicit toggle, persistence, and reduced-motion awareness. (depends: D003)
- [x] D006 Add a contrast-check script for semantic colors and focus rings with AA assertions. (depends: D003)
- [x] D007 Create seam primitives for dashed dividers, stitched corners, connector paths, and patch cards. (depends: D003)
- [x] D008 Create animated stitched logo mark with a static reduced-motion fallback. (depends: D007)
- [x] D009 Create grid, radial fade, aurora mesh, noise overlay, and soft-glow background primitives. (depends: D003)
- [x] D010 Define motion constants for 120/200/320/600ms, cubic-bezier standard easing, spring stiffness 300/damping 30, and reduced-motion fallbacks. (depends: D005)
- [x] D011 Build reusable button and IconButton variants: primary, secondary, ghost, danger, loading, and icon. (depends: D010)
- [x] D012 Build Input, Textarea, Select, Combobox, Switch, Checkbox, Radio, and Slider primitives with validation states. (depends: D010)
- [x] D013 Build Tabs, SegmentedControl, Badge, StatusDot, Tooltip, Popover, DropdownMenu, and ContextMenu. (depends: D010)
- [x] D014 Build Dialog, Drawer, Sheet, Toast, live announcement region, and accessible dismissal behavior. (depends: D010)
- [x] D015 Build Command palette with fuzzy match, spring entrance, keyboard loop, and highlighted match. (depends: D010)
- [x] D016 Build Table, DataList, sticky header, row actions, sortable headers, and responsive fallback. (depends: D011, D012)
- [x] D017 Build Card, stitched Card, Kbd, Avatar, AvatarStack, presence, Breadcrumbs, and Stepper. (depends: D007, D011)
- [x] D018 Build ProgressRing, ProgressBar, Skeleton, EmptyState, ErrorState, Banner, and status explanation primitives. (depends: D011, D013)
- [x] D019 Build CodeBlock with copy, JSONViewer, DiffViewer, Timeline, Sparkline, and chart wrappers. (depends: D011, D016)
- [x] D020 Build Calendar-less date range, Resizable panels, ScrollArea, and Kanban drag/drop primitives. (depends: D012, D016)
- [x] D021 Build stitched logo draw-on, cursor spotlight, magnetic button, and feature-card tilt components. (depends: D008, D010)
- [x] D022 Build broken-storefront-to-fixed morph, glowing before/after slider, and stitched seam transition. (depends: D007, D010)
- [x] D023 Build architecture beams, pinned Break/Patch/Verify/Ship/Rollback story, number ticker, and sparkline draw-in. (depends: D010, D019)
- [x] D024 Build health ring, release pipeline with particles, rollback time machine, and preview morph. (depends: D018, D023)
- [x] D025 Build ship confetti plus undo toast, skeleton shimmer, shared-element transition wrapper, AI thinking orb, and typewriter stream. (depends: D014, D021)
- [x] D026 Build animated DOM-tree visualizer, resolver signal bars, conflict pane merge, audit-chain tamper animation, and integration marquee. (depends: D019, D023)
- [x] D027 Create `/design` gallery route for tokens, primitives, states, and every signature animation. (depends: D011, D012, D013, D014, D015, D016, D017, D018, D019, D020, D021, D022, D023, D024, D025, D026)
- [x] D028 Create `tools/assets` generator entrypoint with deterministic seeds and output manifests. (depends: D002)
- [x] D029 Generate 24 original ShopNest product illustrations with gradients, soft shadows, and isometric or flat-3D composition. (depends: D028)
- [x] D030 Generate stitched browser-window hero artwork plus SVG and 2x PNG outputs through Sharp. (depends: D028)
- [x] D031 Generate one empty-state illustration per dashboard page, 404 art, and error art. (depends: D028)
- [x] D032 Generate OG/social image, favicon set, and extension icons at 16/32/48/128px. (depends: D028)
- [x] D033 Generate deterministic collaborator avatars and AI orb asset. (depends: D028)
- [x] D034 Validate generated assets for dimensions, alpha, naming, no external URLs, and no copyrighted marks. (depends: D029, D030, D031, D032, D033)
- [x] D035 Add design-system component and motion tests for keyboard, reduced motion, and announced state changes. (depends: D027, D034)
- [x] D036 Add screenshot runner for every screen in dark/light at desktop/tablet/mobile widths. (depends: D027, D035)
- [x] D037 Review screenshot baselines and fix default, cramped, misaligned, low-contrast, or boring surfaces. (depends: D036)
- [x] D038 Run design gate: typecheck, tests, build, lint, contrast script, asset manifest, and screenshot command. (depends: D006, D035, D037)

**Runnable after Group 1A:** Every app can import the same visual tokens and
component primitives; `/design` demonstrates the system, assets are generated
offline, and the screenshot/contrast gates are measurable.

## Group 2 — `packages/core` schemas and safety

- [x] P023 Create the core package entrypoint and public exports. (depends: P022)
- [x] P024 Define site, environment, release, manifest, and kill-switch schemas with Zod. (depends: P023)
- [x] P025 Define patch identity, author, revision, lifecycle status, and content hash schemas. (depends: P023)
- [x] P026 Define allowed operations: style, text, attribute, hide, reorder, and badge. (depends: P025)
- [x] P027 Define allowlisted CSS properties and reject `url()`, external fetches, and unsafe values. (depends: P026)
- [x] P028 Define allowlisted attributes and same-origin URL validation. (depends: P026)
- [x] P029 Define review, conflict, verification, health event, and audit entry schemas. (depends: P025)
- [x] P030 Add patch normalization and canonical JSON serialization. (depends: P025)
- [x] P031 Add payload safety errors with plain-English remediation messages. (depends: P027, P028)
- [x] P032 Add 40 malicious operation fixtures covering script, iframe, event handler, JavaScript URL, external URL, CSS exfiltration, and oversized payloads. (depends: P031)
- [x] P033 Test every core schema boundary with valid, invalid, and backwards-compatible fixtures. (depends: P024, P029, P032)
- [x] P034 Run the core safety gate and confirm no `any` types in `packages/core`. (depends: P033)

**Runnable after Group 2:** A standalone core package validates safe patches and
rejects the seeded malicious payload suite.

## Group 3 — `packages/core` fingerprinting and resolver

- [x] P035 Define semantic fingerprint types for tag, attributes, text, path, siblings, landmarks, region, and visual role. (depends: P034)
- [x] P036 Normalize text, tokens, whitespace, numbers, and casing for stable comparison. (depends: P035)
- [x] P037 Detect hashed or noisy class tokens without discarding meaningful classes. (depends: P035)
- [x] P038 Capture stable attributes including id, test ID, name, role, aria label, and href pattern. (depends: P035)
- [x] P039 Capture normalized n-gram signatures and structural DOM path. (depends: P036)
- [x] P040 Capture sibling signatures and nearest landmark chain. (depends: P035)
- [x] P041 Calculate coarse viewport region and visual role. (depends: P035)
- [x] P042 Implement weighted signal similarity with the specified 0.30/0.20/0.15/0.10/0.10/0.05/0.05/0.05 weights. (depends: P036, P037, P038, P039, P040, P041)
- [x] P043 Implement exact, moved, ambiguous, and missing resolver outcomes with confidence and runner-up. (depends: P042)
- [x] P044 Implement configurable confidence thresholds and margin rules. (depends: P043)
- [x] P045 Add human-readable resolver reasons and per-signal score breakdown. (depends: P043)
- [x] P046 Add mutation fixtures for wrappers, moves, renamed classes, edited text, duplicates, reorder, and removal. (depends: P043)
- [x] P047 Add at least 30 resolver mutation tests with wrong-element application asserted to zero. (depends: P046)
- [x] P048 Add a deterministic 200-scenario benchmark generator for later judge evidence. (depends: P047)
- [x] P049 Run the resolver gate and publish an explainable confidence fixture. (depends: P048)

**Runnable after Group 3:** Core can resolve ShopNest targets through realistic
DOM mutations and explain every decision.

## Group 4 — `packages/core` conflicts, integrity, audit, scanner

- [x] P050 Implement target identity and operation property keys for three-way merge. (depends: P049)
- [x] P051 Detect direct property conflicts across two patch revisions. (depends: P050)
- [x] P052 Detect hide-versus-style and reorder-versus-reorder semantic conflicts. (depends: P050)
- [x] P053 Detect stale base manifest conflicts. (depends: P050)
- [x] P054 Detect invalid, ambiguous, and cyclic patch dependencies. (depends: P043, P050)
- [x] P055 Generate conflict explanations and suggested resolutions. (depends: P051, P052, P053, P054)
- [x] P056 Add conflict matrix tests for mergeable and non-mergeable operations. (depends: P055)
- [x] P057 Implement SHA-256 canonical content hashing. (depends: P030)
- [x] P058 Implement Ed25519 manifest signing and verification interfaces. (depends: P057)
- [x] P059 Add manifest version, expiry, site, and release replay protections. (depends: P058)
- [x] P060 Implement hash-chained audit entries and `verifyChain()`. (depends: P057)
- [x] P061 Add tamper fixtures, missing-link fixtures, and invalid-signature fixtures. (depends: P060)
- [x] P062 Implement scanner detectors for contrast, duplicate actions, stale copy, missing labels, broken links, and layout overflow. (depends: P035, P042)
- [x] P063 Add scan finding severity, confidence, evidence, and blast-radius schemas. (depends: P062)
- [x] P064 Test scanner detectors and audit tamper behavior. (depends: P056, P061, P063)
- [x] P065 Run the core gate and verify the `packages/core` LOC threshold is approached through real modules and tests. (depends: P064)

**Runnable after Group 4:** Core supports schema safety, resolver evidence,
conflicts, signed manifests, audit integrity, and scan findings.

## Group 5 — `packages/sdk`

- [x] P066 Create SDK package entrypoint with zero runtime dependencies. (depends: P065)
- [x] P067 Implement `PatchworkSDK.init()` configuration and lifecycle. (depends: P066)
- [x] P068 Implement manifest fetch, cache, version, expiry, and kill-switch handling. (depends: P058, P059)
- [x] P069 Implement signature verification and safe no-op behavior on failure. (depends: P068)
- [x] P070 Implement patch schema validation at runtime. (depends: P024, P025)
- [x] P071 Implement semantic target resolution against the live DOM. (depends: P043, P070)
- [x] P072 Implement transactional mutation applier with inverse operations. (depends: P026, P071)
- [x] P073 Implement MutationObserver re-application with debounce and loop protection. (depends: P072)
- [x] P074 Implement telemetry batching with exponential backoff and health events. (depends: P073)
- [x] P075 Implement circuit breaker and automatic patch disable threshold. (depends: P074)
- [x] P076 Add last-verified manifest fallback when the endpoint is unavailable. (depends: P069)
- [x] P077 Add SDK jsdom tests for React remounts, ambiguous targets, safe skips, rollback, and circuit breaker. (depends: P071, P072, P073, P075, P076)
- [x] P078 Add bundle-size budget and gzip measurement. (depends: P077)
- [x] P079 Run SDK gate and confirm under-15KB gzipped target is measured honestly. (depends: P078)

**Runnable after Group 5:** ShopNest can load a signed manifest and safely apply
patches without importing dashboard code.

## Group 6 — `packages/extension`

- [x] P080 Create Chrome Manifest V3 package, permissions, service worker, content script, and side panel. (depends: P079)
- [x] P081 Implement connection handshake with the active page and API. (depends: P080)
- [x] P082 Implement hover highlight and click-to-select inspector. (depends: P081)
- [x] P083 Implement DOM breadcrumb for parent and child target selection. (depends: P082)
- [x] P084 Render fingerprint preview with stable attributes and fragile-selector warnings. (depends: P043, P083)
- [x] P085 Render resolver confidence and “why this target” signal bars. (depends: P045, P084)
- [x] P086 Implement visual controls for color, typography, spacing, visibility, and text. (depends: P084)
- [x] P087 Implement safe attribute editor and same-origin link checks. (depends: P028, P086)
- [x] P088 Implement reorder interaction constrained to one parent. (depends: P026, P086)
- [x] P089 Implement local undo/redo stack and preview-only mutation state. (depends: P072, P086)
- [x] P090 Implement save draft, open dashboard, and preview privately actions. (depends: P089)
- [x] P091 Add extension empty, offline, unsafe-value, cross-origin, and disappeared-target states. (depends: P081, P090)
- [x] P092 Add extension unit and component tests for keyboard and pointer behavior. (depends: P083, P091)
- [x] P093 Run extension build and package smoke test against a local ShopNest page. (depends: P092)

**Runnable after Group 6:** A developer can scan a live page in the extension,
draft a patch, undo it locally, and hand it to the dashboard.

## Group 7 — `packages/verifier`

- [x] P094 Create verifier package and browser-runner contract. (depends: P093)
- [x] P095 Implement published-versus-patched URL loading. (depends: P094)
- [x] P096 Implement desktop, tablet, and mobile viewport matrix. (depends: P095)
- [x] P097 Implement patch resolution check with exact/moved/ambiguous/missing outcomes. (depends: P071, P095)
- [x] P098 Implement add-to-cart, search, login, and checkout interaction scripts. (depends: P095)
- [x] P099 Implement screenshot capture and visual diff changed-region bounding boxes. (depends: P096)
- [x] P100 Implement accessibility baseline delta checks with axe-core integration. (depends: P096)
- [x] P101 Implement console and network regression checks. (depends: P095)
- [x] P102 Implement structured verification report and score calculation. (depends: P097, P098, P099, P100, P101)
- [x] P103 Seed a deliberately bad hidden-Buy-button patch and assert the verifier blocks it. (depends: P102)
- [x] P104 Add verifier fixtures and report snapshots. (depends: P103)
- [x] P105 Run verifier gate with offline stored-report replay. (depends: P104)

**Runnable after Group 7:** A patch can be verified across viewports and the bad
patch is demonstrably caught.

## Group 8 — `packages/ai`

- [x] P106 Create PatchPilot package and provider interface with offline default. (depends: P105)
- [x] P107 Define tool schemas for scan, explain, suggest, summarize, and draft. (depends: P106)
- [x] P108 Implement prompt templates for findings, conflicts, release risk, and rollback explanation. (depends: P107)
- [x] P109 Implement deterministic offline PatchPilot engine backed by resolver and scanner evidence. (depends: P108, P062)
- [x] P110 Implement plain-English confidence and next-action summaries. (depends: P109)
- [x] P111 Implement auto-heal proposal generation for moved targets without auto-approval. (depends: P043, P109)
- [x] P112 Implement blast-radius narrative for pages, elements, and viewports. (depends: P063, P109)
- [x] P113 Implement health-score narrative combining confidence, verification, SDK errors, and age. (depends: P109)
- [x] P114 Add AI safety tests for hallucinated targets, unsafe operations, and unsupported claims. (depends: P110, P111, P112, P113)
- [x] P115 Add optional provider adapter boundary without requiring credentials in local demo. (depends: P106)
- [x] P116 Run PatchPilot gate with deterministic fixture outputs. (depends: P114, P115)

**Runnable after Group 8:** The system can explain scan findings, conflicts,
health, and auto-heal proposals with deterministic offline behavior.

## Group 9 — `apps/api`

- [x] P117 Create Express API workspace and strict route/module layout. (depends: P116)
- [x] P118 Create atomic JSON store with repository interface and corruption recovery. (depends: P117)
- [x] P119 Create deterministic seed dataset for ShopNest, people, patches, releases, findings, and audit events. (depends: P118)
- [x] P120 Add request ID middleware, structured JSON logs, and consistent error envelope. (depends: P117, P017)
- [x] P121 Add rate limiting, idempotency keys, and payload size limits. (depends: P120)
- [x] P122 Add `/healthz`, `/readyz`, and metrics endpoints. (depends: P120)
- [x] P123 Add sites and environments routes with policy configuration. (depends: P119)
- [x] P124 Add scans and findings routes with scan lifecycle state. (depends: P062, P123)
- [x] P125 Add patches and revisions routes with schema validation and content hash. (depends: P025, P030, P123)
- [x] P126 Add reviews, collaborators, and approval routes. (depends: P125)
- [x] P127 Add conflicts route with resolution suggestions and safe merge action. (depends: P055, P126)
- [x] P128 Add isolated preview route with expiring draft-only manifest. (depends: P068, P125)
- [x] P129 Add verification run route and stored-report replay. (depends: P102, P128)
- [x] P130 Add release, canary, promote, pause, kill-switch, and rollback routes. (depends: P058, P129)
- [x] P131 Add health event ingestion and automatic rollback threshold. (depends: P075, P130)
- [x] P132 Add audit route, chain verification, export, and tamper-test endpoint. (depends: P060, P130)
- [x] P133 Add MockGitHubProvider and PR/review/check state mapping. (depends: P126, P130)
- [x] P134 Add optional OctokitProvider behind server-only configuration. (depends: P133)
- [x] P135 Add API integration tests for idempotency, rollback, conflicts, tamper, and safe errors. (depends: P118, P121, P127, P131, P132)
- [x] P136a Add a typed SCAN/FIX/SHIP workspace read model for dashboard cards, next actions, and release risk. (depends: P135)
- [x] P136b Add a durable activity timeline projection with filtering, cursor pagination, and event explanations. (depends: P136a)
- [x] P136c Add API contract coverage for read models, timeline pagination, and policy edge states. (depends: P136b)
- [x] P136d Add a release-readiness report with policy, verification, health, manifest, audit, and rollback checks. (depends: P136c)
- [x] P136e Add a collaboration projection for review queue, pull-request checks, permissions, and named next owners. (depends: P136d)
- [x] P136f Add API contract coverage for readiness comparisons, collaboration states, and export-safe responses. (depends: P136e)
- [x] P136g Add an operator handoff brief with decision, blockers, metrics, rollback steps, and evidence links. (depends: P136f)
- [x] P136h Add API contract coverage for operator brief states and CSV handoff export. (depends: P136g)
- [x] P136i Add release-delta comparison for patch hashes, policy, health, rollout, and audit changes. (depends: P136h)
- [x] P136j Add API contract coverage for release-delta empty, changed, and missing-candidate states. (depends: P136i)
- [x] P136k Add a content-hashed release snapshot for dashboard deep links and offline handoff. (depends: P136j)
- [x] P136l Add API contract coverage for snapshot hashes, patch membership, and missing releases. (depends: P136k)
- [x] P136 Run API gate and measure `apps/api` LOC against its threshold. (depends: P136l)

**Runnable after Group 9:** One local API can seed, scan, patch, verify, release,
rollback, and report its audit chain without external services.

## Group 10 — `apps/dashboard`

- [x] P137 Split dashboard into route-level modules under the 1,000-line file limit. (depends: P136, D038)
- [x] P138 Create shared design tokens for ink, paper, seam, status colors, type, spacing, and radii. (depends: P137)
- [x] P139 Create reusable Button, Badge, Card, Table, Tabs, Dialog, Toast, EmptyState, Skeleton, and ErrorState primitives. (depends: P138)
- [x] P140 Add responsive shell with left navigation, breadcrumbs, account menu, and mobile navigation. (depends: P139)
- [x] P141 Add command palette with keyboard navigation and search. (depends: P140)
- [x] P142 Add global status language and green/amber/red explanation component. (depends: P139)
- [x] P143 Add `/dashboard` summary with next best action and 60-second time-to-fix stopwatch. (depends: P140, P142)
- [x] P144 Add sites list and site overview with release health and policy gates. (depends: P123, P143)
- [x] P145 Add scan progress, findings, confidence, evidence, and blast-radius screen. (depends: P124, P144)
- [x] P146 Add patch list and kanban with filters, sort, saved view, and realistic data. (depends: P125, P144)
- [x] P147 Add patch composer with operation editor and plain-English explanation. (depends: P086, P146)
- [x] P148 Add target evidence panel with DOM snapshot, signal bars, runner-up, and moved-state explanation. (depends: P045, P147)
- [x] P149 Add isolated preview split view with expiry and share link. (depends: P128, P148)
- [x] P150 Add review inbox, thread, approvals, and collaborator presence. (depends: P126, P147)
- [x] P151 Add conflicts screen with side-by-side changes and one-sentence PatchPilot explanation. (depends: P127, P150)
- [x] P152 Add verification report screen with interaction checks, visual diff, accessibility delta, and console state. (depends: P129, P151)
- [x] P153 Add releases screen with policy checklist, signed manifest, canary slider, promote, pause, and kill switch. (depends: P130, P152)
- [x] P154 Add incidents screen with health event timeline, circuit breaker state, and replay scrubber. (depends: P131, P153)
- [x] P155 Add audit screen with filters, export, chain integrity badge, and tamper details. (depends: P132, P154)
- [x] P156 Add collaborators and PR screen with named people, PR titles, checks, and review state. (depends: P133, P150)
- [x] P157 Add evidence screen with resolver benchmark, SDK budget, regression catches, quality gates, and Lighthouse evidence. (depends: P048, P078, P103, P156)
- [x] P158 Add install screen with SDK snippet, extension steps, copy success, and environment checklist. (depends: P079, P093, P157)
- [x] P159 Add settings screen with site policy, allowlist, notifications, and safe danger zone. (depends: P123, P158)
- [x] P160 Add loading, empty, error, retry, success, optimistic, and toast states to every route. (depends: P143, P144, P145, P146, P147, P149, P150, P151, P152, P153, P154, P155, P156, P157, P158, P159)
- [x] P161 Add full keyboard, focus, reduced-motion, touch, and screen-reader coverage. (depends: P160)
- [x] P162 Add dashboard component tests, route tests, interaction tests, and console-error guards. (depends: P161)
- [ ] P163 Run dashboard gate and measure `apps/dashboard` LOC against 9,000 lines. (depends: P162)

**Runnable after Group 10:** The dashboard is a commercial-grade SCAN/FIX/SHIP
workspace where every mandatory feature is reachable and explained.

## Group 11 — `apps/web` marketing surface

- [ ] P164 Create marketing app shell with shared brand tokens and seam motif. (depends: P163, D038)
- [ ] P165 Build landing hero around “Fix any website in 60 seconds”. (depends: P164)
- [ ] P166 Build interactive SCAN/FIX/SHIP 10-second demo with real local state. (depends: P165)
- [ ] P167 Build before/after repair slider and time-to-fix stopwatch. (depends: P166)
- [ ] P168 Build proof metrics from measured local evidence, not invented claims. (depends: P157, P167)
- [ ] P169 Build product tour route for scan, patch, preview, verify, release, and rollback. (depends: P168)
- [ ] P170 Build security route with threat model summary and signed-manifest story. (depends: P169)
- [ ] P171 Build customers route with agency, storefront, portal, and legacy-app stories. (depends: P169)
- [ ] P172 Build docs route with first-run guide and no dead links. (depends: P170)
- [ ] P173 Add marketing empty, error, reduced-motion, keyboard, and mobile states. (depends: P172)
- [ ] P174 Add marketing tests, metadata, social preview, and Lighthouse budget. (depends: P173)
- [ ] P175 Run web gate and measure `apps/web` LOC against 2,500 lines. (depends: P174)

**Runnable after Group 11:** A non-technical visitor understands the promise,
sees the repair, and can enter the dashboard without documentation.

## Group 12 — `apps/shopnest`

- [ ] P176 Create ShopNest design system and deterministic product fixture data. (depends: P163)
- [ ] P177 Build home route with navigation, search, product cards, and release marker. (depends: P176)
- [ ] P178 Build search route with filters, query state, and no-results state. (depends: P177)
- [ ] P179 Build product route with price, reviews, shipping, and Buy action. (depends: P177)
- [ ] P180 Build cart route with quantity changes, empty state, and checkout CTA. (depends: P179)
- [ ] P181 Build checkout route with address, payment, review, success, retry, and failure. (depends: P180)
- [ ] P182 Build login route with demo sign-in, error, and locked states. (depends: P177)
- [ ] P183 Implement v1 healthy release mode. (depends: P177, P178, P179, P180, P181, P182)
- [ ] P184 Implement v2 breaking mode with moved button, low contrast, stale copy, duplicate action, and hashed classes. (depends: P183)
- [ ] P185 Implement v3 refactor mode with wrapper changes and ambiguous target fixture. (depends: P184)
- [ ] P186 Integrate only the SDK runtime; do not import hardcoded PATCHWORK fixes. (depends: P079, P185)
- [ ] P187 Add ShopNest route and release-mode tests with browser fixtures. (depends: P186)
- [ ] P188 Run ShopNest gate and measure `apps/shopnest` LOC against 2,500 lines. (depends: P187)

**Runnable after Group 12:** ShopNest provides healthy, breaking, and refactor
states for the full demo without hardcoded fixes.

## Group 13 — orchestration, tests, evidence, and launch

- [ ] P189 Create `npm run demo` supervisor that boots API, dashboard, web, ShopNest, and verifier with deterministic ports. (depends: P175, P188)
- [ ] P190 Create `npm run demo:reset` that restores seed state in under five seconds. (depends: P189)
- [ ] P191 Add full-flow Playwright test for scan, visual patch, preview, review, conflict resolution, and verification. (depends: P189)
- [ ] P192 Add full-flow Playwright test for canary, promotion, visitor SDK behavior, and rollback. (depends: P191)
- [ ] P193 Add full-flow Playwright test for v3 relocation, ambiguous skip, health degradation, and audit replay. (depends: P192)
- [ ] P194 Add Playwright console-error, network-error, keyboard, and responsive assertions. (depends: P193)
- [ ] P195 Add resolver benchmark runner and confusion matrix report. (depends: P048, P194)
- [ ] P196 Add SDK budget runner for gzip, manifest latency, apply time, and remount time. (depends: P078, P194)
- [ ] P197 Add verification evidence runner for seeded bad patches and runtime duration. (depends: P103, P194)
- [ ] P198 Add Lighthouse runner for dashboard and marketing routes. (depends: P174, P194)
- [ ] P199 Add test count, coverage, typecheck, lint, and bundle-size evidence. (depends: P022, P163, P175, P188, P195, P196, P197, P198)
- [ ] P200 Create `npm run judge` that builds, tests, benchmarks, runs Playwright, runs tamper and rollback checks, and writes `JUDGE_REPORT.html`. (depends: P199)
- [ ] P201 Update `README.md` with one-line pitch, hero screenshot, architecture Mermaid, quick start, matrix, limitations, and roadmap. (depends: P200)
- [ ] P202 Update `ARCHITECTURE.md`, `THREAT_MODEL.md`, `DEMO.md`, `STATUS.md`, and `DECISIONS.md` with measured final evidence. (depends: P201)
- [ ] P203 Verify every size gate with `npm run loc` and fail the build if a threshold is missed. (depends: P021, P065, P079, P093, P105, P116, P136, P163, P175, P188, P203)
- [ ] P204 Run final clean-room demo from a fresh install and deterministic reset. (depends: P190, P200, P203)
- [ ] P205 Run final Sites build, package, save version, private deploy, and deployment status check. (depends: P204)
- [ ] P206 Re-read `AGENTS.md`, inspect the final checklist, record known limitations, and stop only with all required gates green. (depends: P205)

**Runnable after Group 13:** The full SCAN/FIX/SHIP story runs from one command,
the judge report is evidence-backed, and the deployed product is ready for a
three-minute launch demo.

## Dependency and commit rules

- Never start a task while one of its listed dependencies is unticked.
- Use conventional commits such as `feat(core): add semantic resolver` or
  `test(verifier): catch hidden buy button`.
- If a task reveals a missing prerequisite, add the prerequisite above the task,
  record it in `DECISIONS.md`, and update dependencies before continuing.
- Do not mark a task complete because a screen exists. Mark it complete only when
  the behavior, tests, accessibility states, and group gate support it.
