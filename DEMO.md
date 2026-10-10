# PATCHWORK Demo Script

## Three-minute launch demo

### 0:00 — Context

Open the dashboard and say: “A ShopNest checkout button disappeared after a
release. PATCHWORK will scan the live surface, propose a precise patch, verify
it in isolation, and ship it with a one-click undo path.”

### 0:20 — SCAN

Open the seeded incident. Show the red finding for the hidden Buy button, the
390px evidence, the semantic target, confidence, and blast radius. Explain that
PATCHWORK names the reason in plain English instead of presenting a selector.

### 0:50 — FIX

Open the patch detail. Show the before/after view, the target signals, the
allowlisted operation, and the conflict guard. Preview the patch while the
public storefront remains unchanged. Run the verification gate and show the
interaction, visual, accessibility, and console checks turning green.

### 1:40 — SHIP

Open the release rail. Show signed manifest, reviewer, canary percentage, and
the health ring. Ship the patch, show the restrained seam confetti and undo
toast, then use rollback to demonstrate the time-machine state returning to the
last healthy release.

### 2:20 — Explainability

Open the audit journal and show the hash chain, actor, release, verification
run, and rollback entry. End with: “The fix is small, reversible, and proven.”

## Sixty-second version

1. Scan: select the red hidden Buy button finding.
2. Fix: preview the patch and run the verification gate.
3. Ship: approve the canary, then use the undo toast to roll back.
4. Show the audit entry proving what changed.

## Judge answers

1. **Why not redeploy?** PATCHWORK isolates a small reversible change when the
   source build or vendor ownership makes a full deployment risky.
2. **How is the target found?** A weighted semantic fingerprint uses structure,
   labels, landmarks, siblings, and visual role; low-confidence matches stop.
3. **What happens when the DOM moves?** The resolver proposes an auto-heal with
   evidence or refuses to guess if the runner-up margin is unsafe.
4. **Can a patch inject JavaScript?** No. The core allowlists operations and
   rejects scripts, event handlers, unsafe URLs, external fetches, and CSS
   exfiltration patterns.
5. **How do you test it?** Isolated browser verification records interactions,
   visual diff, accessibility delta, console, and network evidence.
6. **How do you ship safely?** Signed manifests, policy gates, canary rollout,
   health events, kill switch, and rollback.
7. **What makes the audit trustworthy?** Entries are hash-chained and tamper
   checks report the first broken link.
8. **Can non-engineers use it?** Every finding, conflict, and gate has a plain
   English explanation and an obvious next action.
9. **Does it work offline?** The demo uses deterministic local fixtures and an
   offline PatchPilot provider; network-backed integrations remain explicit.
10. **What is the product boundary?** PATCHWORK handles safe frontend patches;
    it does not replace source control, full deploy infrastructure, or business
    policy review.
