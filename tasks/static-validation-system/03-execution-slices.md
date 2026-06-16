# Execution Slices

## Completed

- Added root layers: `check:format`, `check:lint`, `check:type`, `check:config`, `check:dead-code`, `check:security`, `check:build`, and aggregate `check:static`.
- Routed existing backend/frontend/problem-details/token/db/payment checks through shared scripts.
- Added Biome config and changed-file format/lint entrypoints.
- Added ast-grep structural backend rules for raw Hono `HTTPException` usage.
- Added Knip report mode and monorepo workspace config.
- Added Semgrep wrapper and conservative local security rules.
- Added `drizzle-kit check` beside custom DB lint.
- Added `static-gate` CI and rewired backend/frontend/DB workflows to call root scripts.
- Pruned related `AGENTS.md` guidance to stable commands and local operating constraints.

## Remaining Slices

1. Knip cleanup: dependency drift, duplicate exports, then owner-split dead files.
2. Semgrep review: justify or fix `execSync`; review `v-html` trust boundary.
3. Biome cleanup: apply `useImportType` in one mechanical slice if desired.
4. Promotion policy: make report-first layers blocking only after baselines are explicit.
