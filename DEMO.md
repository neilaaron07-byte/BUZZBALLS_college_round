# PATCHWORK demo choreography

The demo follows the product’s own guided tour: **SCAN → AI explains → FIX → VERIFY → SHIP → resolve conflict → auto-rollback → audit proof**.

## 90-second launch cut

| Time | Action | Proof to call out |
| --- | --- | --- |
| 00:00–00:10 | Open `/fix` | One screen, public URL policy, no source rebuild |
| 00:10–00:22 | Click **Scan page** | Detector progress, semantic target evidence, plain-English finding |
| 00:22–00:30 | Click **Fix safe issues** | A real sandboxed before/after preview appears; the public site is unchanged |
| 00:30–00:36 | Compare **Published state** and **Patch preview**, then click **Confirm preview** | The allowlisted contrast operation and its inverse are visible before verification |
| 00:36–00:45 | Click **Stage 10% canary** | Human-gated ship boundary and bounded traffic |
| 00:45–00:55 | Open Conflicts and keep verified patch | A second developer’s stale color is not merged automatically |
| 00:55–01:07 | Ask PatchPilot to explain the conflict | AI uses supplied evidence, recommends the verified target, and stays review-only |
| 01:07–01:18 | Simulate critical health and click **Rollback now** | Health threshold, previous signed manifest, and recovery action |
| 01:18–01:30 | Open Audit | Hash chain, actors, release, rollback entry, and tamper-test handoff |

The recorded Playwright artifact is [docs/demo.webm](docs/demo.webm). The capture script is `tools/demo-video.mjs` and is run with `npm run demo:video`. The resulting WebM is 98.68 seconds because it includes browser settle time between actions; the narrated launch cut remains the 90-second target.

## Three-minute judge cut

1. **00:00–00:25 — Context and SCAN.** Open the seeded ShopNest checkout incident. Show the URL policy, scan progress, detector summary, semantic target, confidence, and blast radius. Explain that the scanner names the target instead of asking a non-technical owner to edit a selector.
2. **00:25–01:05 — FIX.** Apply the safe contrast fix and compare the sandboxed Published state with the Patch preview. Confirm the preview, then show the before/after operation, allowlisted property, inverse rollback value, and the stale conflict. The public storefront remains unchanged.
3. **01:05–01:35 — VERIFY.** Open the verification report. Show interaction, visual, accessibility, console, and network checks plus the viewport matrix. The hidden Buy-button regression is blocked before release.
4. **01:35–02:05 — SHIP.** Open release controls. Show signed manifest, policy gates, reviewer ownership, 10% canary, health ring, pause, kill switch, and promotion boundary.
5. **02:05–02:35 — failure and undo.** Simulate the bad patch’s health event, trigger the automatic rollback path, and show the previous healthy version returning without rebuilding the application.
6. **02:35–03:00 — TRUST.** Open the audit chain, run the tamper test, and copy the evidence brief. End with: “The change is small, reversible, and proven.”

## Local reset

```bash
npm run demo:reset
npm run demo
```

The demo is deterministic. Remote live-site scans require a reachable public origin and never execute third-party scripts in the scanner stage.
