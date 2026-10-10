# MV3 extension smoke evidence

`npm run extension:smoke` bundles the content script, service worker, and side
panel with esbuild, copies the generated extension icons, parses the Manifest V3
metadata, and verifies every packaged file is non-empty.

| Artifact | Bytes |
| --- | ---: |
| Content script | 6,477 |
| Service worker | 513 |
| Side panel | 5,646 |
| Manifest | 803 |

The jsdom suite covers pointer selection, Enter/Escape keyboard behavior,
parent/child navigation, visual controls, same-origin attributes, one-parent
reorder constraints, local undo/redo, offline handshake, and explicit empty,
unsafe, cross-origin, and disappeared-target state rendering.
