# ADR-001: Migrate build and test tooling to rolldown and vitest

## Status
Accepted

## Context
The project shipped with rollup 2 plus `rollup-plugin-json` and
`rollup-plugin-node-resolve` to produce six `examples/*/main.min.js` IIFE
bundles, and had no test runner (`npm test` exited with an error). Completing
the symbol-label work required a real test suite. The user authorised moving to
rolldown and vitest.

## Decision
- Build with `rolldown` 1.3 via `examples/rolldown.config.js` and
  `npm run build-examples`. The config keeps the existing Rollup-shaped array
  of six IIFE outputs and drops both rollup plugins: rolldown resolves bare
  imports and JSON inputs itself.
- Test with `vitest` 5 and `@vitest/coverage-v8`. `npm test` runs `vitest run`;
  `npm run test:coverage` enforces thresholds.
- Coverage is scoped to the five changed symbol-rendering modules. Untouched
  legacy painters are excluded from the threshold.
- `coverage.clean` is `false` and `reportsDirectory` is
  `./node_modules/.vitest-coverage`. The IDE's safe-delete shim rejects
  vitest's default cleanup of a pre-existing `coverage/` directory on Windows,
  and keeping reports inside `node_modules/` avoids stray tracked files.

## Rationale
rolldown preserves the existing config shape, so no rewrite was needed, and
rebuilds all six examples in well under a second. Vitest discovers
`test/*.test.js` without treating `test/helpers/*.js` as test files, which the
Node built-in runner did. Scoping coverage to the changed surface keeps the
quality gate meaningful without demanding tests for files this story never
touched.

## Consequences
- `package-lock.json` moved from lockfile v1 to v3; the three rollup packages
  are removed.
- `examples/rollup.config.js` was replaced by `examples/rolldown.config.js`.
- All six `main.min.js` bundles are regenerated and must be rebuilt after any
  `src/` change.
- Widening the coverage scope later requires adding tests for the legacy
  painters.

## Date
2026-11-09
