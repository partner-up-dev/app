# 06A Exit Evidence — Types-only Surface

## Delivered Boundary

- Added `apps/backend/src/contracts.ts` and the `@partner-up-dev/backend/contracts` package subpath.
- The source uses explicit `export type` declarations only. It exposes selected owner-backed Feedback, join-gate,
  PR value/input and upload value types; it does not export schemas, runtime values, repositories, services, rows or
  wildcard barrels.
- Added explicit Web TypeScript, Web Vitest and System Vitest subpath mappings before the existing root package
  mapping.
- `AppType` remains root-only. `PRId` and `OrderingOfferDetail` remain root compatibility exports because they
  currently derive from persistence shapes.

## Verification

- Task-local resolver probe: `pnpm exec tsc --project 01-types-only-surface/tsconfig.json` — PASS.
- TypeScript resolver probe from the Web configuration resolves the subpath to
  `apps/backend/src/contracts.ts` — PASS.
- TypeScript transpilation of `contracts.ts` emits only `export {};`, with no runtime import or value export — PASS.
- `pnpm check:type:backend` and `pnpm check:type:web` — PASS.
- `pnpm check:lint:backend`, `pnpm check:lint:web`, `pnpm check:build:backend` and `pnpm check:build:web` — PASS.

## Next Boundary

06B moves inferred response/request aliases to Web adapter contracts without changing routes or replacing deliberate
UI input narrowing. It does not migrate `PRId`, Commerce persistence projections or root export retirement.
