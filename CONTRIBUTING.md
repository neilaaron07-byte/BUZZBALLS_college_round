# Contributing to PATCHWORK

PATCHWORK is built as a deterministic, testable product demo. Contributions
should preserve the SCAN → FIX → SHIP flow and make the next safe action obvious.

## Local setup

Requirements:

- Node.js 22.13 or newer
- npm with the repository lockfile
- a local browser for visual review

Install and run the current surface:

```bash
npm install
npm run dev
```

The workspace commands are added as the package graph lands. Use the command
listed in `STATUS.md` for the current phase and keep the Site runtime intact.

## Working loop

1. Re-read `AGENTS.md` before a new phase.
2. Select the next unticked task in `PLAN.md` whose dependencies are complete.
3. Record non-obvious choices in `DECISIONS.md`.
4. Keep a runnable demo after each task group.
5. Run typecheck, tests, build, and lint after each task; run the group gate
   before moving to the next group.
6. Update `PLAN.md` and `STATUS.md` with evidence.
7. Commit one task at a time with a conventional commit message.

## Quality bar

- All buttons must have a real action or be disabled with an explanation.
- Every async surface has loading, empty, success, and error states.
- Keyboard users receive visible focus and equivalent actions.
- New colors use tokens and pass the contrast script.
- Motion uses the shared constants and honors reduced motion.
- Do not add stock images, hotlinked assets, browser dialogs, emoji icons,
  fake data, or handwritten source files over 1,000 lines.
- Preserve the private Site configuration and never commit credentials.

## Commit style

Use imperative conventional commits, for example:

```text
feat(dashboard): add scan findings table
fix(core): reject ambiguous resolver matches
test(verifier): cover hidden buy button regression
docs: record release rollback decision
```

## Demo expectations

The final demo must be deterministic, browser-testable, and understandable to
a non-technical store owner. Use `DEMO.md` for the judge script and make any
known limitation explicit in `STATUS.md` and `README.md`.
