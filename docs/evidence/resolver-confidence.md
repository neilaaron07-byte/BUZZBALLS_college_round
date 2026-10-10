# Resolver confidence fixture

This fixture demonstrates the safety rule used by `@patchwork/core`: a target
can be recovered after structural movement only when the evidence is strong and
the runner-up has a clear margin.

## Scenario

- Site: ShopNest storefront
- Target: `button[data-testid="add-to-cart"]`
- Target fingerprint: `fp_checkout_button_001`
- Candidate: `purchase-panel > div > div > button`
- Candidate label: `Add to cart`
- Outcome: `moved`
- Confidence: `0.9571`
- Exact threshold: `0.96`
- Minimum confidence: `0.72`
- Minimum margin: `0.10`

The candidate is intentionally classified as `moved`, not `exact`: the stable
semantics and copy match, but the structural path gained two wrappers. That
keeps the evidence honest and leaves the final application visible in review.

| Signal | Score | Weight | Contribution | Explanation |
| --- | ---: | ---: | ---: | --- |
| Tag | 1.00 | 0.30 | 0.3000 | Both elements are `button` tags. |
| Stable attributes | 1.00 | 0.20 | 0.2000 | id, test id, role, label, and meaningful class signals agree. |
| Normalized text | 1.00 | 0.15 | 0.1500 | Copy and phrase fragments match. |
| Structural path | 0.5714 | 0.10 | 0.0571 | The path shares the same product and purchase prefix. |
| Siblings | 1.00 | 0.10 | 0.1000 | Nearby siblings are unchanged. |
| Landmarks | 1.00 | 0.05 | 0.0500 | The landmark chain is unchanged. |
| Viewport region | 1.00 | 0.05 | 0.0500 | Both elements remain in the middle-center region. |
| Visual role | 1.00 | 0.05 | 0.0500 | Both elements behave like buttons. |

The resolver mutation suite covers 32 changes, including wrappers, movement,
renamed classes, edited copy, sibling reorder, duplicates, and removal. The
deterministic benchmark generator emits 200 additional scenarios for later
judge evidence. Ambiguous and missing outcomes return no target id, so a caller
cannot accidentally apply a patch to the wrong element.
