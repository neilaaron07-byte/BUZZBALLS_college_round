# PATCHWORK Agent Operating Contract

This repository is being rebuilt as a commercial-grade PATCHWORK launch demo. The
quality bar is Series A product quality: deliberate information architecture,
clear states, restrained motion, plain-English explanations, and reliable flows.
The North Star is:

> Fix any website in 60 seconds. Ship with confidence. Undo in one click.

The product language is three verbs: **SCAN. FIX. SHIP.** Every screen must make
the next step obvious. Every result must be explained in plain English with an
explicit green, amber, or red status. A non-technical person must be able to use
the product without reading documentation.

## Working discipline

1. Re-read this file at the start of every phase.
2. Start every rebuild by creating `AGENTS.md`, then `BRAINSTORM.md`, then
   `PLAN.md`. Do not write feature code until `PLAN.md` exists.
3. Work task by task in the order recorded in `PLAN.md`.
4. After every task: typecheck, test, and build; tick the task in `PLAN.md`.
5. Commit after every task with a conventional commit message.
6. Update `STATUS.md` after every task group with done, in progress, next, and
   known issues.
7. Never ask the user questions for implementation decisions. Make a reasonable
   choice and record it in `DECISIONS.md`.
8. Do not end a turn while unticked tasks remain unless context is genuinely
   near exhaustion. If stopping for that reason, update `STATUS.md` precisely so
   the next turn can continue.
9. Keep the app runnable and demoable after every task group.
10. Preserve the existing package manager, lockfile, Sites hosting metadata, and
    Cloudflare Worker-compatible build shape unless a documented decision says
    why a change is required.
11. Use the Sites capability path for this existing, multi-surface project. Keep
    the local development server alive through implementation, validation, and
    hosting handoff.
12. Use browser storage only for device-local preferences or explicitly local
    state. Use the selected persistence design for durable state.
13. Keep secrets server-side. Do not commit credentials, private keys, tokens,
    or generated deployment secrets.
14. Use accessible semantics, visible focus states, keyboard navigation, touch
    behavior, reduced-motion support, and explicit loading, empty, success, and
    error states.
15. Use realistic, coherent seed data with named people, dates, patch IDs, PR
    titles, and product data. Avoid data that looks fabricated for a screenshot.
16. Prefer small modules and pure functions. No single handwritten source file
    may exceed 1,000 lines.

## Required product promise

All work must serve the PATCHWORK workflow:

- **SCAN**: inspect a website, locate broken or risky elements, explain the
  finding, and show confidence and blast radius.
- **FIX**: create a safe, independently managed patch, resolve targets
  semantically, preview it in isolation, review it collaboratively, and verify
  it automatically.
- **SHIP**: release a signed version with policy gates, canary controls, health
  signals, an audit trail, and one-click rollback.

## Design-system contract

The attached product-design brief is part of this contract. The visual bar is
Vercel dashboard, Linear, Raycast, and Stripe. Anything that reads as a
template, tutorial, or student project fails review.

- Design dark-first with a polished light theme. Use near-black backgrounds,
  three surface elevations, hairline white borders at 8-12% opacity, tiny
  6/8/12px radii, generous whitespace, and a strict 4px spacing grid.
- Use Geist and Geist Mono through the `geist` npm package with fallback stacks.
  Marketing may use 72-96px display type; the app uses dense 13-14px UI text
  and tabular numerals for metrics.
- Use one restrained electric-violet-to-cyan gradient for primary emphasis,
  focus rings, glows, and chart highlights. Semantic status colors must pass AA
  contrast and be verified by a script.
- Use the stitched seam motif everywhere: dashed seams, patch-shaped cards with
  stitched corners, and a square-patch logo. The logo draws itself with a stroke
  animation on first load.
- Use a subtle grid, radial fade, GPU-friendly aurora mesh, 3% noise overlay,
  and soft hero glows. Avoid visual noise and keep motion purposeful.
- Use `motion` or Framer Motion with 120/200/320/600ms durations, standard
  cubic-bezier(0.2, 0, 0, 1), emphasized spring stiffness 300/damping 30, and
  transform/opacity-only animation where possible. Respect reduced motion.
- Implement and document the reusable signature animations listed in the
  design brief: stitched logo, repair morph, before/after slider, spotlight,
  architecture beams, scroll story, tickers, health ring, release pipeline,
  rollback time machine, ship confetti/undo, skeleton shimmer, shared-element
  transitions, magnetic buttons, AI streaming, DOM visualizer, conflict merge,
  audit chain, command palette, and integration marquee.
- Generate original assets with scripts under `tools/assets` into app public
  folders. Product art, hero art, empty/error/404 art, social preview, favicon,
  extension icons, avatars, and AI orb must be original and offline-safe.
  Never use stock photos, hotlinked images, or copyrighted brands.
- Build the reusable component library under `apps/dashboard/src/ui` with
  variants, states, keyboard support, tests, and Radix primitives where
  appropriate. The `/design` route is a live gallery of tokens, components,
  and animations.
- Every surface is responsive to tablet and mobile widths, keyboard navigable,
  screen-reader friendly, and explicit about loading, empty, error, and success
  states. Toasts and AI streaming must be announced accessibly.
- Add a Playwright screenshot script for every screen in dark and light at
  desktop, tablet, and mobile widths under `/docs/screenshots`; review and fix
  cramped, misaligned, default-looking, or boring results.

## Required planning artifacts

- `BRAINSTORM.md` must contain 8 personas with 3 pains each, 30 concrete
  real-world problems PATCHWORK solves, a teardown of Vercel, Linear, Sentry,
  LaunchDarkly, Chromatic, Percy, Optimizely, and Hotjar, 25 delight moments,
  full information architecture, and one consistent signature visual motif.
- `PLAN.md` must contain at least 120 checkbox tasks. Tasks must be small enough
  for one sitting, grouped by package, include dependencies, and be ordered so
  the app is runnable and demoable after every group.
- `STATUS.md` must be maintained after every group.
- `DECISIONS.md` must record non-obvious implementation choices and tradeoffs.

## Measured size gates

Add `npm run loc`, implemented as a small Node script. It must count handwritten
source and test lines per package, excluding lockfiles, generated files, SVG and
asset output, and `node_modules`. The measured minimums are:

| Area | Minimum handwritten lines |
| --- | ---: |
| `packages/core` | 3,000 |
| `packages/sdk` | 1,500 |
| `packages/extension` | 2,500 |
| `packages/verifier` | 1,500 |
| `packages/ai` | 2,000 |
| `apps/api` | 4,000 |
| `apps/dashboard` | 9,000 |
| `apps/web` | 2,500 |
| `apps/shopnest` | 2,500 |
| `tests` (all) | 4,000 |
| **Total** | **25,000+** |

The size must come from real features, real states, and real tests. Never pad
with comments, duplicated code, giant data blobs, or dead code. If a gate is not
met, treat that as evidence of missing features and return to `PLAN.md`.

## Banned

The task is not done if any of these remain:

- lorem ipsum
- “coming soon”
- `TODO` or `FIXME`
- placeholder text
- buttons that do nothing
- fake loading spinners with no real work
- browser `alert`, `confirm`, or `prompt` dialogs
- emoji used as icons
- the default Vite or Tailwind starter look
- unstyled native selects or inputs
- any single 1,000-line handwritten file
- `any` types in `packages/core`
- console errors
- layout shift
- fake-looking mock data

## Required demo and quality gates

The final product must meet all of these:

1. All seven mandatory PATCHWORK features work end to end and are reachable
   through the polished UI.
2. `npm run demo` boots every required service with deterministic seeded data.
3. `npm run judge` passes and reports real measured evidence.
4. `npm run loc` meets every size gate above.
5. Lighthouse targets: performance 90+, accessibility 95+, best practices 95+
   on both the dashboard and the marketing landing page.
6. A full Playwright demo run has zero console errors.
7. `npm run demo:reset` restores the starting state quickly and deterministically.
8. Verification catches seeded bad patches, including a hidden Buy button.
9. Smart tracking safely handles moved, renamed, duplicated, missing, and
   ambiguous targets without applying to the wrong element.
10. Releases support signed manifests, canary rollout, kill switch, health
    events, automatic rollback, and an immutable hash-chained audit trail.

## Definition of done

Do not claim completion until the implementation, tests, measured size report,
demo commands, judge report, documentation, and deployment all agree with this
contract. Known limitations must be stated honestly in `README.md`, `STATUS.md`,
and the final handoff.
