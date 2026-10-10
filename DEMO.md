# PATCHWORK demo choreography

The demo follows the product’s own guided tour: **SCAN → AI explains → FIX → VERIFY → SHIP → resolve conflict → auto-rollback → audit proof**.

## 90-second launch cut

| Time | Action | Proof to call out |
| --- | --- | --- |
| 00:00–00:10 | Open `/fix` | One screen, public URL policy, no source rebuild |
| 00:10–00:22 | Click **Scan page** | Detector progress, semantic target evidence, plain-English finding |
| 00:22–00:32 | Click **Fix safe issues** | Private preview and inverse operation; public site is unchanged |
| 00:32–00:42 | Click **Stage 10% canary** | Human-gated ship boundary and bounded traffic |
| 00:42–00:52 | Open Conflicts and keep verified patch | A second developer’s stale color is not merged automatically |
| 00:52–01:04 | Ask PatchPilot to explain the conflict | AI uses supplied evidence, recommends the verified target, and stays review-only |
| 01:04–01:16 | Simulate critical health and click **Rollback now** | Health threshold, previous signed manifest, and recovery action |
| 01:16–01:30 | Open Audit | Hash chain, actors, release, rollback entry, and tamper-test handoff |

The recorded Playwright artifact is [docs/demo.webm](docs/demo.webm). The capture script is `tools/demo-video.mjs` and is run with `npm run demo:video`. The resulting WebM is 98.68 seconds because it includes browser settle time between actions; the narrated launch cut remains the 90-second target.

## Three-minute judge cut

1. **00:00–00:25 — Context and SCAN.** Open the seeded ShopNest checkout incident. Show the URL policy, scan progress, detector summary, semantic target, confidence, and blast radius. Explain that the scanner names the target instead of asking a non-technical owner to edit a selector.
2. **00:25–01:05 — FIX.** Apply the safe contrast fix in private preview. Show the before/after operation, allowlisted property, inverse rollback value, and the stale conflict. The public storefront remains unchanged.
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
