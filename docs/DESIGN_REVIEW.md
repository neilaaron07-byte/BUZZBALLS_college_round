# PATCHWORK visual review

Review date: 2026-10-11
Capture: `npm run screenshots`
Matrix: 30 routes × 2 themes × 3 viewports = 180 screenshots, reviewed through route contact sheets and spot checks. The first capture exposed a real browser failure: dashboard requests were blocked by missing local CORS headers. That was corrected in `apps/api/src/cors.ts`; the second capture completed 180/180 with no browser console errors.

The review uses the Vercel dashboard as the quality bar: one dominant action per surface, strong information scent, calm density, predictable responsive behavior, and evidence that is easy to scan without reading every card.

## Findings and repairs

Each item has a concrete visual or interaction consequence. `P0` blocks a trustworthy demo, `P1` harms comprehension or responsive use, and `P2` is polish that affects perceived quality.

1. **P0 — dashboard CORS failure on the first pass.** Dashboard routes rendered with empty fallback data while the browser logged blocked API requests. The local API now emits an explicit allowlist for the two local origins and handles preflight before the request context.
2. **P0 — visual evidence did not include the PatchPilot or guided-fix routes.** A review that omits the two most important workflows is incomplete. The screenshot matrix now captures both routes in every theme and viewport.
3. **P1 — the PatchPilot drawer is a full second page on mobile.** Its narrow column contains the assistant transcript, tool cards, evidence, and composer in one long uninterrupted stack. The repair target is a bounded drawer with a sticky header, a scroll region, and a composer that remains visible.
4. **P1 — PatchPilot content has no compact summary state.** The user sees implementation detail before the next action. The repair target is a short “what changed / confidence / next step” summary above expandable evidence.
5. **P1 — the dashboard sidebar consumes too much tablet width.** At the middle viewport, the navigation competes with the content grid and leaves cards with cramped copy. The repair target is a narrower rail and earlier collapse of secondary labels.
6. **P1 — dashboard pages have too many equal-weight cards.** Overview, evidence, releases, and audit show several dark panels with similar borders and headings, so the eye cannot identify the primary decision. The repair target is a stronger lead card and quieter supporting cards.
7. **P1 — status color is repeated without enough textual hierarchy.** Green, amber, and violet accents appear in dots, badges, borders, and buttons at the same time. The repair target is one dominant status treatment per region, with the explanation carrying the meaning.
8. **P1 — dashboard body copy is too small at tablet and mobile widths.** Secondary explanations and evidence details approach the lower edge of comfortable reading. The repair target is a minimum readable size and tighter line lengths instead of shrinking type.
9. **P1 — the evidence table is a desktop table forced into a phone column.** Long gate details become a vertical wall of tiny labels. The repair target is a stacked evidence card model below the tablet breakpoint with value and status first.
10. **P1 — audit history has weak grouping.** Events are visually similar even though deployment, verification, and rollback entries carry different operational weight. The repair target is grouped chronology with a visible event type and a clearer current-state marker.
11. **P2 — the audit hash is visually over-emphasized relative to the human explanation.** The cryptographic value is long and attracts more attention than the plain-English integrity result. The repair target is a shortened display value with an explicit copy affordance and the explanation first.
12. **P1 — settings has an overly wide two-column relationship at tablet width.** Policy and notifications become narrow cards while the danger zone drops far below. The repair target is a single-column tablet layout and a consistently placed save action.
13. **P1 — settings switches are visually subtle in the light theme.** The thumb and track are easy to miss against the pale card surface. The repair target is a stronger on/off contrast plus a text state for non-color recognition.
14. **P2 — the settings danger zone is too visually similar to ordinary policy.** Its destructive intent is only apparent after reading the eyebrow. The repair target is a deliberate red boundary, a short consequence statement, and a separated action row.
15. **P1 — the guided-fix hero uses too much horizontal whitespace on desktop.** The headline and first action sit in a wide field while the useful scan context is small. The repair target is a narrower reading measure and a more prominent scan card.
16. **P1 — the guided-fix stepper becomes cramped on mobile.** Three stages and their labels compete in one row. The repair target is compact numbered stages with the active stage expanded and inactive stages reduced to labels.
17. **P1 — the guided-fix URL field and scan action lose hierarchy on narrow screens.** The action is adjacent to dense helper text and has little breathing room. The repair target is a full-width action below the field at the phone breakpoint.
18. **P2 — the guided-fix session timer reads like a decorative status.** It is separated from the active step and does not explain what is being timed. The repair target is a compact “session time” label aligned with the step context.
19. **P1 — ShopNest keeps a pale storefront surface in dark captures.** This makes the theme matrix look inconsistent and makes the dark-mode capture less useful for checking contrast. The repair target is an explicit storefront theme boundary with a visible light-surface label rather than an accidental-looking mismatch.
20. **P1 — ShopNest empty states contain too much dead vertical space.** Cart, wishlist, and account screens leave the primary recovery action isolated in a large blank field. The repair target is a compact empty-state panel with a useful next action and a small related recommendation.
21. **P1 — ShopNest checkout hierarchy is weak on mobile.** Product summary, delivery details, and payment content become a long sequence with no persistent total. The repair target is a sticky or repeated order total at the action boundary.
22. **P2 — ShopNest product copy is too pale on the light surface.** Supporting text competes poorly with the product image and purchase panel. The repair target is a darker secondary text token and stronger price/action contrast.
23. **P1 — ShopNest search and account controls become tiny at phone width.** The header keeps desktop density instead of prioritizing search, cart, and account. The repair target is a two-row mobile header with clear touch targets.
24. **P1 — ShopNest review and support pages rely on narrow stacked columns.** Their content remains technically present but loses the visual anchors that make the desktop layout scannable. The repair target is an explicit mobile section order and stronger section headings.
25. **P2 — marketing long pages have abrupt density changes.** Hero, feature grids, proof blocks, and footer do not share a consistent vertical rhythm in the full-page captures. The repair target is a restrained section spacing scale and repeated proof-card geometry.
26. **P1 — marketing mobile hero copy is too close to the first interactive card.** The next action is not clearly separated from the value statement. The repair target is a distinct action band with a single primary CTA.
27. **P2 — marketing secondary cards have low edge contrast in dark mode.** Their boundary is visible in isolation but disappears among neighboring cards. The repair target is a slightly clearer seam border without increasing glow.
28. **P1 — marketing subpages repeat the same card treatment for different kinds of proof.** Security, customers, and docs need different visual signals, but the current geometry makes them feel interchangeable. The repair target is one signature visual per page type: controls, outcomes, and guidance.
29. **P2 — the design-system screen is too long for a review surface.** It demonstrates many tokens but makes the evaluator scroll through repeated examples before reaching the responsive details. The repair target is grouped token panels with an in-page index.
30. **P1 — design-system mobile examples are too small to validate.** A token sample that cannot be read at the screenshot scale is not useful evidence. The repair target is fewer, larger examples with a clear purpose label.
31. **P1 — repeated footer seams do not provide enough closure on long pages.** The motif is present, but the repeated line and tiny caption become visual noise. The repair target is one stronger end-of-section seam and less repetition inside dense screens.
32. **P2 — light-theme cards use near-white surfaces with weak separation.** On evidence, settings, and audit, neighboring regions can merge when viewed quickly. The repair target is a consistent surface-1/surface-2 separation rather than heavier shadows.
33. **P1 — amber text is not always paired with an explanation at the point of decision.** A badge can be read as decorative if the consequence is below the fold. The repair target is a one-sentence amber explanation next to each blocking or review action.
34. **P1 — long lists have no progressive disclosure.** Release, incident, audit, and PatchPilot evidence all show the full detail stack immediately. The repair target is a concise first view with detail revealed through an intentional, labeled control.
35. **P2 — several action rows have inconsistent button widths.** “Open verification”, “View policy”, and export/copy controls do not form a stable rhythm across pages. The repair target is shared action sizing and alignment tokens.
36. **P1 — empty and error states are not visually distinct enough from loaded states.** A blank result can look like a slow or failed request. The repair target is a named state, an explanation, and a recovery action in the same component family.
37. **P1 — loading transitions risk layout shift.** Cards appear at their final height only after content resolves, which can move the action area. The repair target is reserved card geometry and skeletons that match the final block shapes.
38. **P2 — no interaction capture measured motion quality.** Static screenshots cannot reveal drawer jank, toast collision, or focus-ring jumps. The repair target is a Playwright interaction pass with reduced-motion emulation and console/network assertions.
39. **P1 — focus order is not visible in the visual matrix.** Keyboard reachability is a core confidence signal for a tool that edits live sites. The repair target is a focused-state pass on guided-fix, PatchPilot, settings, and release actions.
40. **P1 — the first review had a misleading success mode.** Because API requests failed silently at the surface, screenshot capture could have produced polished but incomplete pages. The repair target is a capture gate that fails on browser errors and records the error count in the evidence artifact.

## Second-pass acceptance criteria

- Capture matrix remains 180/180 with zero browser console errors and zero failed requests.
- PatchPilot and guided-fix remain readable at 390px wide without horizontal overflow.
- Evidence reports the measured browser, API, SDK, rollback, and quality signals in plain language.
- The second review checks both light and dark themes and all three viewports again; any remaining limitation is recorded instead of hidden.

## Second-pass result

The second 180-image pass completed 180/180 with no browser console errors. The
PatchPilot drawer, guided-fix action hierarchy, ShopNest empty-state geometry,
and Evidence metric cards were re-opened across desktop, tablet, and mobile in
both themes. Remaining limitations are intentional and documented: the
ShopNest fixture is light-first by product direction, Lighthouse capture is
still pending, and the package-size gates remain below the requested thresholds.
