# SDK size evidence

`npm run sdk:size` bundles `packages/sdk/src/index.ts` for the browser with
esbuild, minifies it, and measures the resulting gzip bytes. The check is
deliberately run on the emitted artifact instead of estimating from source
lines.

| Measurement | Result |
| --- | ---: |
| Raw minified bundle | 19,736 bytes |
| Gzipped bundle | 7,212 bytes |
| Budget | 15,360 bytes |
| Result | Pass |

The shipped runtime uses lightweight structural guards and imports only the
portable fingerprint, resolver, canonical, and Web Crypto modules. The full
Zod schema boundary remains available in `@patchwork/core` for API, verifier,
and authoring surfaces without inflating the browser runtime.
