# PATCHWORK

PATCHWORK is a safety layer for fixing live website defects without rebuilding
the original application. It connects SCAN, FIX, and SHIP in one reversible
workflow: find the broken element, preview a semantic patch, verify it in an
isolated browser, release it with health controls, and undo it in one click.

The repository is being upgraded from a working vinext Site starter into a
multi-surface workspace. `STATUS.md` records the current implementation state;
`DEMO.md` describes the seeded ShopNest checkout incident.

## Prerequisites

- Node.js `>=22.13.0`

## Quick Start

```bash
npm install
npm run dev
npm run build
```

This starter does not use `wrangler.jsonc`.

## Included Shape

- current transitional Site code lives under `app/`
- target workspace surfaces live under `apps/` and reusable safety behavior under
  `packages/`
- `.openai/hosting.json` declares optional Sites D1 and R2 bindings
- `vite.config.ts` simulates declared bindings for local development
- `db/schema.ts` remains available for the persistence migration
- `examples/d1/` contains an optional D1 example surface
- `drizzle.config.ts` supports local migration generation when needed

## Workspace Auth Headers

Signed-in visitors receive both `oai-authenticated-user-id` and `oai-authenticated-user-email`. Private Sites require every visitor to sign in; public Sites may also have anonymous visitors, for whom neither header is present.

The user ID is stable for the same user on the same Site and different across Sites. Email and name are intended for display or contact purposes.

SIWC-authenticated workspace sites may also receive
`oai-authenticated-user-full-name` when the user's SIWC profile has a non-empty
`name` claim. The full-name value is percent-encoded UTF-8 and is accompanied by
`oai-authenticated-user-full-name-encoding: percent-encoded-utf-8`.

Treat the full name as optional and fall back to email when it is absent:

```tsx
import { headers } from "next/headers";

export default async function Home() {
  const requestHeaders = await headers();
  const userId = requestHeaders.get("oai-authenticated-user-id");
  const email = requestHeaders.get("oai-authenticated-user-email");
  const encodedFullName = requestHeaders.get("oai-authenticated-user-full-name");
  const fullName =
    encodedFullName &&
    requestHeaders.get("oai-authenticated-user-full-name-encoding") ===
      "percent-encoded-utf-8"
      ? decodeURIComponent(encodedFullName)
      : null;

  const displayName = fullName ?? email;
  // ...
}
```

## Optional Dispatch-Owned ChatGPT Sign-In

Import the ready-to-use helpers from `app/chatgpt-auth.ts` when the site needs
optional or required ChatGPT sign-in:

- Use `getChatGPTUser()` for optional signed-in UI.
- Use `requireChatGPTUser(returnTo)` for server-rendered pages that should send
  anonymous visitors through Sign in with ChatGPT.
- Use `chatGPTSignInPath(returnTo)` and `chatGPTSignOutPath(returnTo)` for
  browser links or actions.
- Pass a same-origin relative `returnTo` path for the destination after sign-in
  or sign-out. The helper validates and safely encodes it.
- Mark protected pages with `export const dynamic = "force-dynamic"` because
  they depend on per-request identity headers.

Dispatch owns `/signin-with-chatgpt`, `/signout-with-chatgpt`, `/callback`, the
OAuth cookies, and identity header injection. Do not implement app routes for
those reserved paths. Routes that do not import and call the helper remain
anonymous-compatible.

SIWC establishes identity only; it does not prove workspace membership. Use the
Sites hosting platform's access policy controls for workspace-wide restrictions,
or enforce explicit server-side membership or allowlist checks.

Use SIWC for account pages, user-specific dashboards, saved records, and write
actions tied to the current ChatGPT user. Leave public content anonymous.

## Useful Commands

- `npm run dev`: start local development
- `npm run build`: verify the vinext build output
- `npm test`: build the starter and verify its rendered loading skeleton
- `npm run db:generate`: generate Drizzle migrations after schema changes

The final workspace will also provide `npm run demo`, `npm run demo:reset`,
`npm run judge`, and `npm run loc`; their evidence is tracked in `STATUS.md`.

## Feature-to-proof matrix

| Product promise | User-visible proof | Automated proof |
| --- | --- | --- |
| SCAN | Finding severity, target evidence, confidence, blast radius | Scanner fixtures and resolver mutation tests |
| FIX | Patch operations, before/after preview, review and conflict explanation | Core safety, conflict, and preview tests |
| VERIFY | Interaction, visual, accessibility, console, and network results | Verifier browser run and screenshot assertions |
| SHIP | Signed manifest, policy gates, canary, health ring | Release lifecycle integration tests |
| UNDO | Rollback time machine, kill switch, undo toast | Rollback and audit-chain tests |
| TRUST | Immutable audit journal and plain-English explanations | Hash-chain tamper tests and judge report |

## Known limitations

The workspace migration and measured size gates are in progress. The current
transitional Site still exposes the seeded incident demo, but the dashboard,
marketing surface, package graph, visual gallery, screenshot baselines, and
deployment evidence will only be claimed complete after their plan gates pass.

## Learn More

- [vinext Documentation](https://github.com/cloudflare/vinext)
- [Drizzle D1 Guide](https://orm.drizzle.team/docs/get-started/d1-new)
