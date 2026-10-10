# PATCHWORK Status

Updated: 2026-10-10

## Current state

- Current group: Group 1A — design language, motion, components, and assets.
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

## Next

1. Add workspace contracts and deterministic developer commands.
2. Install and wire the design-system dependencies.
3. Build tokens, themes, seam primitives, motion primitives, and the live `/design` gallery.
4. Generate and validate original assets before dashboard feature work.

## Known issues

- The repository is still a single vinext app; the target workspace packages do not exist yet.
- The current ShopNest incident surface still contains the first-pass visual language and will be migrated incrementally.
- The LOC, judge, Lighthouse, and screenshot gates cannot pass until the workspace and routes are implemented.
- The currently deployed Site reflects the prior validated incident demo, not this rebuild in progress.
- `npm install` reports 30 transitive audit findings in the existing toolchain; no production feature dependency was added yet.
