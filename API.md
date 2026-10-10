# PATCHWORK API

The canonical machine-readable contract is served at `/openapi.json` and is defined in `apps/api/src/openapi.ts`. The local base URL is `http://127.0.0.1:8787`.

## Envelope

Successful responses use `{ "data": ... , "requestId": "..." }`. Errors use `{ "error": { "code": "...", "message": "...", "requestId": "..." } }`. State-changing requests should send `idempotency-key`; request tracing accepts `x-request-id`, and site-scoped operations accept `x-patchwork-site`.

## Read model

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/healthz` | Process health |
| GET | `/readyz` | Repository and seed readiness |
| GET | `/api/sites` | Managed sites |
| GET | `/api/sites/{siteId}/workspace` | Typed SCAN/FIX/SHIP workspace |
| GET | `/api/sites/{siteId}/timeline` | Cursor-paginated activity |
| GET | `/api/releases/{releaseId}/readiness` | Plain-English release gates |
| GET | `/api/releases/{releaseId}/snapshot` | Content-hashed release snapshot |
| GET | `/api/sites/{siteId}/collaboration` | Review ownership and readiness |
| GET | `/api/audit/verify` | Hash-chain validity |

## Write model

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/api/sites/{siteId}/scans` | Run a deterministic scan |
| POST | `/api/patches` | Create a validated patch |
| POST | `/api/patches/{patchId}/revisions` | Add a stale-base-guarded revision |
| POST | `/api/verification-runs` | Store browser verification evidence |
| POST | `/api/releases/{releaseId}/rollback` | Restore the previous healthy manifest |
| POST | `/api/health-events` | Ingest a health signal and evaluate auto-rollback |
| POST | `/api/v1/live-sites/scan` | Start a bounded public-origin scan |
| GET | `/api/v1/live-sites/scans/{jobId}` | Read scan progress |
| GET | `/api/v1/live-sites/scans/{jobId}/events` | Stream scan progress over SSE |
| POST | `/api/v1/ai/stream` | Stream an evidence-grounded PatchPilot answer |

## Safety rules

The API never accepts arbitrary script injection as a patch operation. Patch writes pass core schema validation, same-origin policy, content hashing, and inverse checks. Release writes require policy evidence and runtime handshake state; the dashboard is an operator surface, not a bypass.

## Contract workflow

```bash
curl http://127.0.0.1:8787/openapi.json
npm run api:smoke
```

The OpenAPI document is intentionally compact for the local demo. Schema detail lives in the typed request parsers and domain records under `apps/api/src` and `packages/core/src`.
