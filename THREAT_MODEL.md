# PATCHWORK Threat Model

PATCHWORK changes a live browser surface. The safety boundary is the signed,
allowlisted manifest plus semantic target resolution; the dashboard is not
trusted merely because a user can see it.

## Assets and trust boundaries

- Customer website DOM, content, and user interactions.
- Patch manifests, revisions, signatures, expiry, and kill switches.
- Dashboard identities, approvals, release policy, and audit history.
- SDK runtime, extension runtime, verifier browser, and API persistence.
- Telemetry that may include URLs, selectors, screenshots, and error detail.

## Threats and mitigations

### Patch injection

Threat: an attacker submits script-like content, event handlers, external URLs,
iframes, or unsafe CSS through a patch operation.

Mitigations: schema validation, operation allowlists, CSS and attribute
sanitization, same-origin URL checks, payload limits, signed manifests, and
fail-safe no-op behavior. Tests cover malicious fixtures before release.

### Manifest replay or downgrade

Threat: an old signed manifest is replayed after a safer release or kill switch.

Mitigations: site and environment binding, monotonic version checks, expiry,
release nonce, current kill-switch state, and an audit entry for every accepted
or rejected manifest.

### Collaborator compromise

Threat: a valid account approves a dangerous or out-of-scope patch.

Mitigations: least-privilege roles, separate author and approver policy,
immutable review history, signed release approval, policy gates, and one-click
kill switch. High-risk operations require a second reviewer.

### SDK denial of service

Threat: a patch loops through MutationObserver callbacks, grows telemetry, or
blocks page interaction.

Mitigations: bounded payloads, debounced observers, loop protection, circuit
breaker thresholds, telemetry batching with backoff, operation time budgets, and
transactional inverse operations.

### SSRF and data exfiltration

Threat: patch URLs, preview fetches, or telemetry destinations access private
networks or leak customer data.

Mitigations: same-origin and protocol allowlists, server-side egress policy,
redaction, no arbitrary fetch operation in patch DSL, CSP-compatible runtime,
and explicit preview origin validation.

### CSS exfiltration

Threat: CSS values use external resources or selectors to encode sensitive
content to an attacker-controlled host.

Mitigations: reject `url()`, external imports, unsafe custom properties, and
unbounded selector/value lengths; restrict operations to the documented
allowlist and test representative exfiltration payloads.

### Wrong-element mutation

Threat: a moved, duplicated, or renamed element receives a patch intended for a
different target.

Mitigations: semantic fingerprints, weighted signals, confidence thresholds,
runner-up margin, explicit ambiguous outcomes, resolver evidence, isolated
preview, and human approval for auto-heal proposals.

## Residual risk

PATCHWORK cannot prove that a permitted visual change is good for every browser
or business context. Verification therefore runs interaction, visual,
accessibility, console, and network checks across representative viewports, and
releases support canary, health observation, kill switch, and rollback.
