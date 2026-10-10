# Test policy

Tests use deterministic fixtures named by product surface and scenario, such as
`shopnest.checkout.hidden-buy-button`. Browser tests fail on console errors and
unexpected network failures. Snapshots are reserved for stable visual or
serialized evidence; behavioral assertions should prefer explicit values.

Every new state should cover the normal path plus loading, empty, error,
permission, keyboard, and reduced-motion behavior when that state applies.
