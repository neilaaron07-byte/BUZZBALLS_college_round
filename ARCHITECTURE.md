# PATCHWORK Architecture

PATCHWORK is organized around a reversible patch lifecycle:

```text
live site -> SCAN -> finding -> draft patch -> review -> isolated preview
           -> VERIFY -> signed release -> canary -> health -> promote/rollback
```

## Workspace boundaries

- `packages/core`: schemas, fingerprints, resolver, conflicts, hashes, audit,
  and scanner detectors. It has no UI dependency and no `any` types.
- `packages/sdk`: small browser runtime that verifies and applies signed
  manifests, watches remounts, emits health events, and can safely no-op.
- `packages/extension`: inspector and visual editor that creates reviewable
  drafts without owning release policy.
- `packages/verifier`: isolated browser verification orchestration and evidence.
- `packages/ai`: PatchPilot explanations and tool contracts with deterministic
  offline behavior for the demo.
- `apps/api`: auth-aware API and persistence boundary for sites, patches,
  reviews, verification, releases, incidents, and audit entries.
- `apps/dashboard`: operator workspace for SCAN, FIX, and SHIP.
- `apps/web`: public marketing and product education surface.
- `apps/shopnest`: realistic target storefront and seeded incident.

## Lifecycle detail

### Draft and review

The extension or dashboard selects a semantic target and emits an operation
with evidence. The API stores a revision with a canonical content hash. Review
shows the changed property, resolver signals, blast radius, and policy impact.

### Isolated preview

The verifier loads the base site and candidate manifest in an isolated context.
It records screenshots, interaction results, accessibility deltas, console
errors, network failures, and target-resolution evidence. Preview state is
explicitly separate from the public site.

### Release and canary

An approved revision is signed for one site and environment. The release
controller starts with a bounded cohort, emits health events, and exposes
pause, promote, and kill-switch actions. A failed policy gate blocks signing.

### Rollback

Rollback selects the previous healthy signed manifest, verifies it, writes a
hash-chained audit entry, and disables the failed release. The dashboard keeps
the failed patch and health evidence linked so the incident is explainable.

## Data and safety rules

Durable state belongs behind the API persistence boundary. Browser storage is
reserved for theme and device-local demo preferences. Secrets remain server-side.
Every state-changing action carries request ID, actor, site ID, release ID, and
severity in structured logs.

## Demo mode

The deterministic demo uses a seeded clock and fixtures that include a hidden
Buy button, a moved target, an ambiguous duplicate, a rejected unsafe patch,
verification evidence, canary health events, and a rollback. `npm run demo`
starts the surfaces with this same state every time.
