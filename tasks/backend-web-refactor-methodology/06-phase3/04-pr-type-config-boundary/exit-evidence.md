# Slice 3-4 Exit Evidence

## Result

- Added the neutral `domains/pr-type-config` owner with root category entrypoints: `commands.ts`, `queries.ts`,
  `contracts.ts`, and an internal persistence adapter.
- Moved the 18-entry production consumer inventory off `PRTypeConfigRepository`: Discovery (2), Authoring (3),
  PR lifecycle (6), Admin PR Type Config (5), and Admin PR management (2).
- The only remaining production domain repository import is
  `apps/backend/src/domains/pr-type-config/services/persistence.ts`; test mocks are deliberately outside this
  runtime assertion.
- Admin reuses the owner's core schemas/projections and retains only HTTP/operator composition. Route-application
  review now lives in the Admin adapter and delegates the config mutation to the owner command.
- No route, response shape, schema or migration changed. The owner preserves current-policy reads while creation
  defaults materialize onto a PR only at creation.

## Structural Evidence

| Probe | Result |
| --- | --- |
| Production repository-import search | `PRTypeConfigRepository` occurs only in the owner persistence adapter. |
| Architecture fitness | 125 known / 0 new / 0 stale. The reporter now recognizes only root `index.ts` or root four-category entrypoints (`commands`, `queries`, `contracts`, `events`, `ports`) as public; nested implementation paths remain private and have positive/negative fixtures. |
| Public contract shape | Discovery, Authoring, Lifecycle and Admin consume named projections or commands; no raw configuration row crosses a runtime owner boundary. |

## Behavior Evidence

- Owner units prove one catalog set read, narrow projections without persistence timestamps, normalized duplicate
  rejection, field-sliced updates, and route-pool append idempotence.
- The Admin HTTP scenario proves authentication, config creation/detail/update, case-insensitive duplicate
  rejection, user route submission → Admin review → owner-owned route-pool append.
- The same scenario proves snapshot timing: an existing PR keeps the original type default notes after an Admin
  config edit, while a later PR receives the new default.
- Existing PR materialization units retain the independent guard against overwriting an already materialized
  participation snapshot.

## Verification

| Check | Result |
| --- | --- |
| Selected owner/Admin/Authoring/Lifecycle/Discovery unit batch | PASS — 38 tests. |
| Selected Backend scenarios | PASS — 6 files / 14 tests, including Admin/auth/route/snapshot HTTP + DB proof. |
| `pnpm check:type:backend` | PASS. |
| `pnpm check:lint:backend` | PASS after removing the moved Authoring import. |
| `pnpm check:build:backend` | PASS. |
| `node --test tools/architecture-fitness/architecture-fitness.test.mjs` | PASS — 5 tests. |
| fitness `--check-new` | PASS — 125 known / 0 new / 0 stale. |

## Controlled Follow-on

- `3-5` owns the remaining `pr-core` compatibility retirement; its known fitness findings are not relabeled as
  compliant by this slice.
- `3-6` owns Web types-only surface and remaining type-only raw-entity cleanup. It must not turn operator
  projections into a second DTO truth.
- Root package/workspace changes and the three unrelated task directories recorded in `entry-delta.md` remain
  excluded from this slice.
