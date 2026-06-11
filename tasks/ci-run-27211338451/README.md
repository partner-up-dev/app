# CI Run 27211338451

## Objective & Hypothesis

Diagnose why GitHub Actions run `27211338451` failed and propose a bounded fix.

Current hypothesis: backend CI installs only the root package and backend
dependency graph, but root Vitest project orchestration still loads the frontend
Vitest config. The frontend config imports `jsonc-parser`, which is only declared
under the frontend package, so the backend-only install cannot initialize Vitest.

## Guardrails Touched

- CI workflow: `.github/workflows/backend-gate.yml`
- Test platform contract: `docs/20-product-tdd/test-platform.md`
- Root Vitest orchestration: `vitest.config.ts`
- Frontend project config: `apps/frontend/vitest.config.ts`

## Verification

- `gh run view 27211338451 --json ...` confirmed workflow `Backend Gate`,
  job `backend-gate`, failed step `Run backend unit tests`.
- `gh run view 27211338451 --log-failed` showed startup failure before tests:
  `Cannot find package 'jsonc-parser' imported from .../apps/frontend/vitest.config.ts`.
- `.github/workflows/backend-gate.yml` installs with
  `pnpm --filter . --filter @partner-up-dev/backend... install --frozen-lockfile`.
- `pnpm --filter . --filter @partner-up-dev/backend... why jsonc-parser` returned
  no owner; `pnpm --filter @partner-up-dev/frontend why jsonc-parser` shows the
  dependency exists only as a frontend dev dependency.
- `pnpm test:unit:backend` passed after the fix: 59 files, 214 tests.
- `pnpm test:scenario:backend` passed after the fix: 23 files, 64 tests.
- `pnpm --filter @partner-up-dev/backend test:unit` passed after the fix,
  confirming the backend package-local script resolves the backend-only config.
- `git diff --check` passed.

## Current Understanding

This is not a failing backend assertion. It is a test runner startup dependency
topology issue. Vitest v4 initializes project configs listed in root
`vitest.config.ts` even when the run is filtered to `--project backend-unit`.
Because the frontend config has a top-level import from `jsonc-parser`, the
backend gate needs that dependency installed or the runner must avoid loading
the frontend config in this CI slice.

## Proposed Fix

Preferred fix: give backend CI a backend-only Vitest orchestration path and make
both backend test scripts use it, so `backend-unit` and `backend-scenario` do not
initialize frontend project config files. This preserves the test-platform
contract that backend projects stay Node-only and do not load frontend-only
dependencies.

Short-term fallback: expand backend CI dependency installation to include the
frontend workspace package, for example:

```bash
pnpm --filter . --filter @partner-up-dev/backend... --filter @partner-up-dev/frontend install --frozen-lockfile
```

The fallback is smaller but makes backend CI depend on frontend dev dependency
shape. It is acceptable as a tactical unblocker, but weaker as durable topology.

## Implementation

- Added `vitest.backend.config.ts` as the backend-only Vitest orchestration
  entry.
- Updated root backend unit and backend scenario scripts to use the backend-only
  config.
- Updated backend package-local test scripts to use the same backend-only
  config.
- Added `vitest.backend.config.ts` to the Backend Gate path filter so changes to
  the backend-only test entry continue to trigger CI.
- Raised the backend unit project timeout to 10 seconds after local full-suite
  verification showed several dynamic-import tests can exceed Vitest's default
  5-second timeout under parallel load while still passing with a larger stable
  budget.
- Recorded the backend-only runner boundary in
  `docs/20-product-tdd/test-platform.md`.

## Next Step

Re-run GitHub Actions run `27211338451` or the `Backend Gate` workflow on PR
`#250`.
