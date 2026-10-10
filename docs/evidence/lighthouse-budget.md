# PATCHWORK Lighthouse budget

This is the acceptance budget for the public landing page and operator
workspace. The runner belongs to the final quality group because it must boot
the complete deterministic demo and collect scores against the production build.

| Route | Performance | Accessibility | Best practices |
| --- | ---: | ---: | ---: |
| `/web` | 90+ | 95+ | 95+ |
| `/dashboard?view=overview` | 90+ | 95+ | 95+ |

The current screenshot sweep is green for HTTP responses, responsive coverage,
and browser console errors. Lighthouse scores remain explicitly unmeasured
until the dedicated runner is implemented in P198; no score is inferred from
the screenshot pass.

The public routes share the same metadata base, local social preview asset, and
offline-safe shell. Any score below budget blocks the release until the
regression is fixed and the runner is green again.
